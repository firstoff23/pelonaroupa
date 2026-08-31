from __future__ import annotations

import argparse
import csv
import random
from collections import defaultdict
from pathlib import Path


def split_manifest(
    source: Path,
    train_output: Path,
    val_output: Path,
    val_ratio: float = 0.2,
    seed: int = 42,
) -> tuple[int, int]:
    if not 0.0 < val_ratio < 1.0:
        raise ValueError("val_ratio must be between 0 and 1")

    with source.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        rows = list(reader)
        fieldnames = reader.fieldnames

    if not rows or not fieldnames:
        raise ValueError("manifest is empty")
    if "animal_id" not in fieldnames:
        raise ValueError("manifest must contain animal_id for leakage-safe splitting")

    groups: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        animal_id = row["animal_id"].strip()
        if not animal_id:
            raise ValueError("every sample must have a non-empty animal_id")
        groups[animal_id].append(row)

    rng = random.Random(seed)
    animal_ids = sorted(groups)
    rng.shuffle(animal_ids)

    target_val_rows = max(1, round(len(rows) * val_ratio))
    val_animals: set[str] = set()
    val_rows = 0
    for animal_id in animal_ids:
        if val_rows >= target_val_rows:
            break
        val_animals.add(animal_id)
        val_rows += len(groups[animal_id])

    train_rows = [r for r in rows if r["animal_id"] not in val_animals]
    validation_rows = [r for r in rows if r["animal_id"] in val_animals]
    if not train_rows or not validation_rows:
        raise ValueError("split produced an empty train or validation set")

    train_output.parent.mkdir(parents=True, exist_ok=True)
    val_output.parent.mkdir(parents=True, exist_ok=True)
    for output, selected in ((train_output, train_rows), (val_output, validation_rows)):
        with output.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(selected)

    return len(train_rows), len(validation_rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Leakage-safe AnimalMind train/validation split by animal_id")
    parser.add_argument("source", type=Path)
    parser.add_argument("--train-output", type=Path, required=True)
    parser.add_argument("--val-output", type=Path, required=True)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    train_n, val_n = split_manifest(
        args.source,
        args.train_output,
        args.val_output,
        val_ratio=args.val_ratio,
        seed=args.seed,
    )
    print({"train_rows": train_n, "val_rows": val_n})


if __name__ == "__main__":
    main()
