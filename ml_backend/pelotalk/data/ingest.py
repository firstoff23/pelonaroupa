"""Dataset ingestion helpers for the PeloTalk pre-training audit.

The module is intentionally conservative: it reads local/Hub-exported metadata,
keeps source provenance intact, and never invents behavioral labels.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any, Iterable

from .manifest import ManifestRow, row_from_mapping, validate_rows, write_jsonl


def read_jsonl(path: str | Path) -> list[dict[str, Any]]:
    with Path(path).open("r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def read_csv(path: str | Path) -> list[dict[str, Any]]:
    with Path(path).open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def load_metadata(path: str | Path) -> list[dict[str, Any]]:
    path = Path(path)
    if path.suffix.lower() == ".jsonl":
        return read_jsonl(path)
    if path.suffix.lower() == ".csv":
        return read_csv(path)
    raise ValueError(f"Unsupported metadata format: {path.suffix}")


def normalize_rows(rows: Iterable[dict[str, Any]], source_dataset: str) -> list[ManifestRow]:
    normalized: list[ManifestRow] = []
    for raw in rows:
        enriched = dict(raw)
        enriched.setdefault("source_dataset", source_dataset)
        normalized.append(row_from_mapping(enriched))
    return normalized


def ingest_metadata(metadata_path: str | Path, source_dataset: str, output_path: str | Path) -> dict[str, Any]:
    rows = normalize_rows(load_metadata(metadata_path), source_dataset)
    errors = validate_rows(rows)
    write_jsonl(rows, output_path)
    return {
        "source_dataset": source_dataset,
        "rows": len(rows),
        "validation_errors": len(errors),
        "status": "PASS" if not errors else "REVIEW",
        "errors": errors[:50],
        "output": str(output_path),
    }
