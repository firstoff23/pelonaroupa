from __future__ import annotations

import argparse
import csv
from collections import Counter
from pathlib import Path

LABELS = {
    "posture": {"standing", "sitting", "lying", "crouching", "unknown"},
    "head": {"raised", "neutral", "lowered", "unknown"},
    "ears": {"forward", "neutral", "backward", "asymmetric", "unknown"},
    "tail": {"high", "neutral", "low", "tucked", "unknown"},
    "movement": {"still", "walking", "running", "shaking", "unknown"},
}
REQUIRED = {"sample_id", "keypoints", "animal_id", *LABELS}


def validate(path: Path) -> dict[str, int]:
    rows = list(csv.DictReader(path.open("r", encoding="utf-8", newline="")))
    if not rows:
        raise ValueError(f"manifest is empty: {path}")
    missing = REQUIRED - set(rows[0])
    if missing:
        raise ValueError(f"missing columns: {sorted(missing)}")

    sample_ids: set[str] = set()
    keypoint_paths: set[str] = set()
    animals = Counter()
    for index, row in enumerate(rows, start=2):
        sample_id = row["sample_id"].strip()
        keypoints = row["keypoints"].strip()
        animal_id = row["animal_id"].strip()
        if not sample_id:
            raise ValueError(f"row {index}: empty sample_id")
        if sample_id in sample_ids:
            raise ValueError(f"row {index}: duplicate sample_id {sample_id!r}")
        if not keypoints:
            raise ValueError(f"row {index}: empty keypoints path")
        if keypoints in keypoint_paths:
            raise ValueError(f"row {index}: duplicate keypoints path {keypoints!r}")
        if animal_id:
            animals[animal_id] += 1
        for head, allowed in LABELS.items():
            value = row[head].strip()
            if value not in allowed:
                raise ValueError(f"row {index}: invalid {head} label {value!r}")
        sample_ids.add(sample_id)
        keypoint_paths.add(keypoints)

    unknown_counts = {
        head: sum(1 for row in rows if row[head].strip() == "unknown")
        for head in LABELS
    }
    return {
        "rows": len(rows),
        "unique_animals": len(animals),
        "duplicate_animals": sum(1 for count in animals.values() if count > 1),
        **{f"{head}_unknown": count for head, count in unknown_counts.items()},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate an AnimalMind behavior manifest.")
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    print(validate(args.manifest))


if __name__ == "__main__":
    main()
