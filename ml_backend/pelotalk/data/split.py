"""Group-aware split utilities: the same animal must never cross train/val/test."""
from __future__ import annotations
from collections import defaultdict
from dataclasses import replace
import random
from .manifest import ManifestRow

def group_split(rows: list[ManifestRow], seed: int = 42, train_ratio: float = 0.70, val_ratio: float = 0.15) -> list[ManifestRow]:
    if train_ratio <= 0 or val_ratio <= 0 or train_ratio + val_ratio >= 1:
        raise ValueError("train_ratio + val_ratio must be < 1 and both ratios > 0")
    groups: dict[tuple[str, str], list[ManifestRow]] = defaultdict(list)
    for row in rows: groups[(row.species, row.animal_id)].append(row)
    keys = list(groups); random.Random(seed).shuffle(keys)
    if len(keys) < 3:
        raise ValueError("at least 3 animal groups are required to populate train/validation/test")
    target_train = len(rows) * train_ratio; target_val = len(rows) * val_ratio
    train_n = val_n = 0; assignments: dict[tuple[str, str], str] = {}
    reserved = ("train", "validation", "test")
    for key, split in zip(keys[:3], reserved):
        assignments[key] = split
        size = len(groups[key])
        if split == "train": train_n += size
        elif split == "validation": val_n += size
    for key in keys[3:]:
        size = len(groups[key])
        if train_n + size <= target_train or train_n == 0:
            split = "train"; train_n += size
        elif val_n + size <= target_val or val_n == 0:
            split = "validation"; val_n += size
        else:
            split = "test"
        assignments[key] = split
    return [replace(row, split=assignments[(row.species, row.animal_id)]) for row in rows]

def leakage_report(rows: list[ManifestRow]) -> dict[str, object]:
    valid_splits = {"train", "validation", "test"}
    owners: dict[tuple[str, str], set[str]] = defaultdict(set)
    for row in rows: owners[(row.species, row.animal_id)].add(row.split or "unset")
    cross_split = {f"{s}:{a}": sorted(splits) for (s, a), splits in owners.items() if len(splits) > 1}
    invalid_split_rows = [f"{row.sample_id}:{row.split or 'unset'}" for row in rows if (row.split or "unset") not in valid_splits]
    return {
        "cross_split_animals": len(cross_split),
        "examples": dict(list(cross_split.items())[:20]),
        "invalid_split_rows": len(invalid_split_rows),
        "invalid_examples": invalid_split_rows[:20],
        "status": "BLOCK" if cross_split or invalid_split_rows else "PASS",
    }
