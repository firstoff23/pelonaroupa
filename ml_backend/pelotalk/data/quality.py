"""Lightweight audio file quality checks for pre-training dataset audit."""
from __future__ import annotations
from pathlib import Path
from typing import Any

AUDIO_SUFFIXES = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".webm"}

def _header_matches(path: Path) -> bool:
    header = path.read_bytes()[:16]
    suffix = path.suffix.lower()
    if suffix == ".wav":
        return len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WAVE"
    if suffix == ".flac":
        return header.startswith(b"fLaC")
    if suffix == ".ogg":
        return header.startswith(b"OggS")
    if suffix == ".mp3":
        return header.startswith(b"ID3") or (len(header) >= 2 and header[0] == 0xFF and (header[1] & 0xE0) == 0xE0)
    if suffix == ".m4a":
        return len(header) >= 12 and header[4:8] == b"ftyp"
    if suffix == ".webm":
        return header.startswith(b"\x1a\x45\xdf\xa3")
    return False

def scan_files(root: str | Path) -> list[Path]:
    root = Path(root)
    return [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in AUDIO_SUFFIXES]

def basic_file_report(path: Path) -> dict[str, Any]:
    result = {"path": str(path), "exists": path.exists(), "size_bytes": 0, "status": "ok"}
    if not path.exists(): result["status"] = "missing"; return result
    result["size_bytes"] = path.stat().st_size
    if result["size_bytes"] == 0: result["status"] = "empty"
    elif not _header_matches(path): result["status"] = "corrupt"
    return result
