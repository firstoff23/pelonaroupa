"""Lightweight audio file quality checks for pre-training dataset audit."""
from __future__ import annotations
from pathlib import Path
from typing import Any

AUDIO_SUFFIXES = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".webm"}

def scan_files(root: str | Path) -> list[Path]:
    root = Path(root)
    return [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in AUDIO_SUFFIXES]

def basic_file_report(path: Path) -> dict[str, Any]:
    result = {"path": str(path), "exists": path.exists(), "size_bytes": 0, "status": "ok"}
    if not path.exists(): result["status"] = "missing"; return result
    result["size_bytes"] = path.stat().st_size
    if result["size_bytes"] == 0: result["status"] = "empty"
    return result
