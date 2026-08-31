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
    "posture": ["standing", "sitting", "lying", "crouching", "unknown"],
    "head": ["raised", "neutral", "lowered", "unknown"],
    "ears": ["forward", "neutral", "backward", "asymmetric", "unknown"],
    "tail": ["high", "neutral", "low", "tucked", "unknown"],
    "movement": ["still", "walking", "running", "shaking", "unknown"],
}
REQUIRED_COLUMNS = {"keypoints", "animal_id", *LABELS}


class PoseDataset(Dataset[tuple[torch.Tensor, dict[str, torch.Tensor], dict[str, torch.Tensor]]]):
    """Load a manifest; blank labels are treated as unsupervised for that head."""

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

    def __getitem__(self, index: int):
        row = self.rows[index]
        features = extract_geometric_features(np.load(row["keypoints"]), cfg=FeatureConfig())
        targets: dict[str, torch.Tensor] = {}
        masks: dict[str, torch.Tensor] = {}
        for name, classes in LABELS.items():
            value = row[name].strip()
            if not value:
                targets[name] = torch.tensor(0, dtype=torch.long)
                masks[name] = torch.tensor(False)
                continue
            if value not in classes:
                raise ValueError(f"invalid {name} label {value!r} at row {index}")
            targets[name] = torch.tensor(classes.index(value), dtype=torch.long)
            masks[name] = torch.tensor(True)
        return torch.from_numpy(features), targets, masks


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def evaluate(model: BodyLanguageModel, loader: DataLoader, device: torch.device) -> dict[str, float]:
    model.eval()
    truth = {name: [] for name in LABELS}
    pred = {name: [] for name in LABELS}
    with torch.inference_mode():
        for features, targets, masks in loader:
            outputs = model(features.to(device))
            for name in LABELS:
                mask = masks[name].bool()
                if not mask.any():
                    continue
                truth[name].extend(targets[name][mask].tolist())
                pred[name].extend(outputs[name].argmax(dim=-1).cpu()[mask].tolist())

    result: dict[str, float] = {}
    macro_values: list[float] = []
    weighted_values: list[float] = []
    accuracy_values: list[float] = []
    for name in LABELS:
        if not truth[name]:
            continue
        macro = f1_score(truth[name], pred[name], average="macro", zero_division=0)
        weighted = f1_score(truth[name], pred[name], average="weighted", zero_division=0)
        accuracy = accuracy_score(truth[name], pred[name])
        result[f"{name}_macro_f1"] = float(macro)
        result[f"{name}_weighted_f1"] = float(weighted)
        result[f"{name}_accuracy"] = float(accuracy)
        macro_values.append(float(macro))
        weighted_values.append(float(weighted))
        accuracy_values.append(float(accuracy))
    result["macro_f1"] = float(np.mean(macro_values)) if macro_values else 0.0
    result["weighted_f1"] = float(np.mean(weighted_values)) if weighted_values else 0.0
    result["accuracy"] = float(np.mean(accuracy_values)) if accuracy_values else 0.0
    return result


def train(train_manifest: str, val_manifest: str, output: str, epochs: int = 40, batch_size: int = 64, lr: float = 1e-3, patience: int = 7) -> None:
    set_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_ds, val_ds = PoseDataset(train_manifest), PoseDataset(val_manifest)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    sample_features, _, _ = train_ds[0]
    model = BodyLanguageModel(input_dim=sample_features.numel(), heads=[HeadSpec(n, len(c)) for n, c in LABELS.items()]).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.05, reduction="none")
    best_score, best_state, stale = -1.0, None, 0

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        for features, targets, masks in train_loader:
            optimizer.zero_grad(set_to_none=True)
            outputs = model(features.to(device))
            losses = []
            for name in LABELS:
                per_sample = criterion(outputs[name], targets[name].to(device))
                mask = masks[name].to(device).bool()
                if mask.any():
                    losses.append(per_sample[mask].mean())
            if not losses:
                raise RuntimeError("batch contains no supervised labels")
            loss = torch.stack(losses).mean()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            total_loss += float(loss.item())

        metrics = evaluate(model, val_loader, device)
        print(json.dumps({"epoch": epoch, "loss": total_loss / max(1, len(train_loader)), **metrics}, sort_keys=True))
        if metrics["macro_f1"] > best_score:
            best_score = metrics["macro_f1"]
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            stale = 0
        else:
            stale += 1
            if stale >= patience:
                print(json.dumps({"early_stopping": True, "epoch": epoch}))
                break

    if best_state is None:
        raise RuntimeError("training produced no checkpoint")
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    torch.save({
        "state_dict": best_state,
        "labels": LABELS,
        "input_dim": sample_features.numel(),
        "feature_config": {"expected_keypoints": 24, "coordinate_dim": 3, "center": "withers", "scale_pair": ["withers", "throat"]},
    }, output)


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
    train(args.train_manifest, args.val_manifest, args.output, args.epochs, args.batch_size, args.lr, args.patience)
