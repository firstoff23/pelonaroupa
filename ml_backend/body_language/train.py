from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import accuracy_score, f1_score
from torch import nn
from torch.utils.data import DataLoader, Dataset

from .features import FeatureConfig, extract_geometric_features
from .model import BodyLanguageModel, HeadSpec

LABELS = {
    "posture": ["standing", "sitting", "lying", "crouching"],
    "head": ["raised", "neutral", "lowered"],
    "ears": ["forward", "neutral", "backward", "unknown"],
    "tail": ["high", "neutral", "low", "tucked", "unknown"],
    "movement": ["still", "walking", "running", "shaking", "unknown"],
}

REQUIRED_COLUMNS = {"keypoints", "animal_id", *LABELS}


class PoseDataset(Dataset[tuple[torch.Tensor, dict[str, torch.Tensor]]]):
    """Loads a labeled pose manifest. Behavior labels must be human/proper-source annotations."""

    def __init__(self, manifest: str | Path) -> None:
        path = Path(manifest)
        self.rows = list(csv.DictReader(path.open("r", encoding="utf-8", newline="")))
        if not self.rows:
            raise ValueError(f"manifest is empty: {path}")
        missing = REQUIRED_COLUMNS - set(self.rows[0])
        if missing:
            raise ValueError(f"manifest is missing columns: {sorted(missing)}")

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, dict[str, torch.Tensor]]:
        row = self.rows[index]
        keypoints = np.load(row["keypoints"])
        features = extract_geometric_features(keypoints, cfg=FeatureConfig())
        targets = {}
        for name, classes in LABELS.items():
            value = row[name]
            if value not in classes:
                raise ValueError(f"invalid {name} label {value!r} at row {index}")
            targets[name] = torch.tensor(classes.index(value), dtype=torch.long)
        return torch.from_numpy(features), targets


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def evaluate(model: BodyLanguageModel, loader: DataLoader, device: torch.device) -> dict[str, float]:
    model.eval()
    truth: dict[str, list[int]] = {name: [] for name in LABELS}
    pred: dict[str, list[int]] = {name: [] for name in LABELS}
    with torch.inference_mode():
        for features, targets in loader:
            features = features.to(device)
            outputs = model(features)
            for name in LABELS:
                truth[name].extend(targets[name].tolist())
                pred[name].extend(outputs[name].argmax(dim=-1).cpu().tolist())

    macro = {
        name: f1_score(truth[name], pred[name], average="macro", zero_division=0)
        for name in LABELS
    }
    weighted = {
        name: f1_score(truth[name], pred[name], average="weighted", zero_division=0)
        for name in LABELS
    }
    accuracy = {
        name: accuracy_score(truth[name], pred[name])
        for name in LABELS
    }
    return {
        **{f"{name}_macro_f1": float(value) for name, value in macro.items()},
        **{f"{name}_weighted_f1": float(value) for name, value in weighted.items()},
        **{f"{name}_accuracy": float(value) for name, value in accuracy.items()},
        "macro_f1": float(np.mean(list(macro.values()))),
        "weighted_f1": float(np.mean(list(weighted.values()))),
        "accuracy": float(np.mean(list(accuracy.values()))),
    }


def train(
    train_manifest: str,
    val_manifest: str,
    output: str,
    epochs: int = 40,
    batch_size: int = 64,
    lr: float = 1e-3,
    patience: int = 7,
) -> None:
    set_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_ds = PoseDataset(train_manifest)
    val_ds = PoseDataset(val_manifest)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    sample_features, _ = train_ds[0]
    model = BodyLanguageModel(
        input_dim=sample_features.numel(),
        heads=[HeadSpec(name, len(classes)) for name, classes in LABELS.items()],
    ).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)

    best_score = -1.0
    best_state = None
    epochs_without_improvement = 0

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        for features, targets in train_loader:
            features = features.to(device)
            optimizer.zero_grad(set_to_none=True)
            outputs = model(features)
            loss = sum(criterion(outputs[name], targets[name].to(device)) for name in LABELS)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            running_loss += float(loss.item())

        metrics = evaluate(model, val_loader, device)
        payload = {
            "epoch": epoch,
            "loss": running_loss / max(1, len(train_loader)),
            **metrics,
        }
        print(json.dumps(payload, sort_keys=True))

        if metrics["macro_f1"] > best_score:
            best_score = metrics["macro_f1"]
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            epochs_without_improvement = 0
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= patience:
                print(json.dumps({"early_stopping": True, "epoch": epoch}))
                break

    if best_state is None:
        raise RuntimeError("training produced no checkpoint")
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": best_state,
            "labels": LABELS,
            "input_dim": sample_features.numel(),
            "feature_config": {
                "expected_keypoints": 24,
                "coordinate_dim": 3,
                "center": "withers",
                "scale_pair": ["withers", "throat"],
            },
        },
        output,
    )
    print(f"saved checkpoint: {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train-manifest", required=True)
    parser.add_argument("--val-manifest", required=True)
    parser.add_argument("--output", default="artifacts/body_language.pt")
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--patience", type=int, default=7)
    args = parser.parse_args()
    train(
        args.train_manifest,
        args.val_manifest,
        args.output,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        patience=args.patience,
    )
