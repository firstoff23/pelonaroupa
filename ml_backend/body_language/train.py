from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import f1_score
from torch import nn
from torch.utils.data import DataLoader, Dataset

from .features import FeatureConfig, extract_geometric_features
from .model import HeadSpec, BodyLanguageModel

LABELS = {
    "posture": ["standing", "sitting", "lying", "crouching"],
    "head": ["raised", "neutral", "lowered"],
    "ears": ["forward", "neutral", "backward", "unknown"],
    "tail": ["high", "neutral", "low", "tucked", "unknown"],
    "movement": ["still", "walking", "running", "shaking", "unknown"],
}


class PoseDataset(Dataset[tuple[torch.Tensor, dict[str, torch.Tensor]]]):
    """Reads a manifest containing one .npy pose file per sample."""

    def __init__(self, manifest: str | Path) -> None:
        self.rows = list(csv.DictReader(Path(manifest).open("r", encoding="utf-8", newline="")))
        if not self.rows:
            raise ValueError("manifest is empty")
        required = {"keypoints", *LABELS}
        missing = required - set(self.rows[0])
        if missing:
            raise ValueError(f"manifest is missing columns: {sorted(missing)}")

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, dict[str, torch.Tensor]]:
        row = self.rows[index]
        keypoints = np.load(row["keypoints"])
        features = extract_geometric_features(keypoints, cfg=FeatureConfig())
        targets = {
            name: torch.tensor(LABELS[name].index(row[name]), dtype=torch.long)
            for name in LABELS
        }
        return torch.from_numpy(features), targets


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def evaluate(model: BodyLanguageModel, loader: DataLoader) -> dict[str, float]:
    model.eval()
    collected: dict[str, list[int]] = {name: [] for name in LABELS}
    predicted: dict[str, list[int]] = {name: [] for name in LABELS}
    with torch.inference_mode():
        for features, targets in loader:
            outputs = model(features)
            for name in LABELS:
                collected[name].extend(targets[name].tolist())
                predicted[name].extend(outputs[name].argmax(dim=-1).tolist())
    scores = {
        f"{name}_macro_f1": f1_score(collected[name], predicted[name], average="macro", zero_division=0)
        for name in LABELS
    }
    scores["macro_f1"] = float(np.mean(list(scores.values())))
    return scores


def train(manifest: str, output: str, epochs: int = 40, batch_size: int = 64, lr: float = 1e-3) -> None:
    set_seed(42)
    dataset = PoseDataset(manifest)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    sample_features, _ = dataset[0]
    model = BodyLanguageModel(
        input_dim=sample_features.numel(),
        heads=[HeadSpec(name, len(classes)) for name, classes in LABELS.items()],
    )
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    best_score = -1.0
    best_state = None

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        for features, targets in loader:
            optimizer.zero_grad(set_to_none=True)
            outputs = model(features)
            loss = sum(criterion(outputs[name], targets[name]) for name in LABELS)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            running_loss += float(loss.item())
        metrics = evaluate(model, loader)
        print(json.dumps({"epoch": epoch, "loss": running_loss / len(loader), **metrics}))
        if metrics["macro_f1"] > best_score:
            best_score = metrics["macro_f1"]
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    if best_state is None:
        raise RuntimeError("training produced no checkpoint")
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": best_state, "labels": LABELS, "input_dim": sample_features.numel()}, output)
    print(f"saved checkpoint: {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", default="artifacts/body_language.pt")
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=1e-3)
    args = parser.parse_args()
    train(args.manifest, args.output, args.epochs, args.batch_size, args.lr)
