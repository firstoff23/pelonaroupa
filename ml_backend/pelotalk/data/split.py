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
    target_train = len(rows) * train_ratio; target_val = len(rows) * val_ratio
    train_n = val_n = 0; assignments: dict[tuple[str, str], str] = {}
    for key in keys:
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
    owners: dict[tuple[str, str], set[str]] = defaultdict(set)
    for row in rows: owners[(row.species, row.animal_id)].add(row.split or "unset")
    cross_split = {f"{s}:{a}": sorted(splits) for (s, a), splits in owners.items() if len(splits) > 1}
    return {"cross_split_animals": len(cross_split), "examples": dict(list(cross_split.items())[:20]), "status": "BLOCK" if cross_split else "PASS"}
