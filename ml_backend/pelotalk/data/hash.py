"""Audio hashing utilities for duplicate detection during dataset audit."""
from __future__ import annotations

import hashlib
from pathlib import Path

CHUNK_SIZE = 1024 * 1024


def sha256_file(path: str | Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        while chunk := handle.read(CHUNK_SIZE):
            digest.update(chunk)
    return digest.hexdigest()


def duplicate_groups(paths: list[str | Path]) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = {}
    for path in paths:
        digest = sha256_file(path)
        groups.setdefault(digest, []).append(str(path))
    return {digest: members for digest, members in groups.items() if len(members) > 1}
