"""Command-line dataset audit for PeloTalk.

Usage:
    python -m ml_backend.pelotalk.data.audit /kaggle/input/dataset

The audit is intentionally metadata-first. It never assigns behavioral intent
from a context string and exits with a non-zero status when critical readiness
conditions fail.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from .hash import duplicate_groups
from .quality import basic_file_report, scan_files


def audit(root: Path) -> dict[str, object]:
    files = scan_files(root)
    reports = [basic_file_report(path) for path in files]
    empty = [item for item in reports if item["status"] == "empty"]
    missing = [item for item in reports if item["status"] == "missing"]
    corrupt = [item for item in reports if item["status"] == "corrupt"]
    duplicates = duplicate_groups([Path(item["path"]) for item in reports if item["status"] == "ok"])
    extensions = Counter(path.suffix.lower() for path in files)
    return {
        "root": str(root),
        "audio_files": len(files),
        "extensions": dict(sorted(extensions.items())),
        "empty_files": len(empty),
        "missing_files": len(missing),
        "corrupt_files": len(corrupt),
        "duplicate_hash_groups": len(duplicates),
        "duplicate_files": sum(len(items) - 1 for items in duplicates.values()),
        "status": "PASS" if files and not empty and not missing and not corrupt else "REVIEW",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("--out", type=Path, default=Path("pelotalk_audit.json"))
    args = parser.parse_args()
    result = audit(args.root)
    args.out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
