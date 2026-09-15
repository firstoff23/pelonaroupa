"""Canonical PeloTalk manifest helpers. No training code lives here."""
from __future__ import annotations
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any
import json

REQUIRED_COLUMNS = ("sample_id", "audio_path", "source_dataset", "species", "animal_id", "breed", "recording_session", "duration_s", "sample_rate", "vocalization", "context", "emotion", "arousal", "intent", "license", "split")

@dataclass
class ManifestRow:
    sample_id: str
    audio_path: str
    source_dataset: str
    species: str
    animal_id: str
    breed: str | None = None
    recording_session: str | None = None
    duration_s: float | None = None
    sample_rate: int | None = None
    vocalization: str | None = None
    context: str | None = None
    emotion: str | None = None
    arousal: float | None = None
    intent: str | None = None
    license: str | None = None
    split: str | None = None

def normalize_label(value: Any) -> str | None:
    if value is None: return None
    text = str(value).strip().lower().replace("-", "_").replace(" ", "_")
    if not text or text in {"nan", "none", "null", "unknown"}: return None
    aliases = {"barking":"bark", "dog_bark":"bark", "woof":"bark", "meowing":"meow", "cat_meow":"meow", "purring":"purr", "growling":"growl"}
    return aliases.get(text, text)

def normalize_identifier(value: Any) -> str | None:
    if value is None: return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "null", "unknown"}: return None
    return text

def parse_optional_float(value: Any) -> float | str | None:
    if value is None: return None
    if isinstance(value, str) and not value.strip(): return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return str(value)

def parse_optional_int(value: Any) -> int | str | None:
    if value is None: return None
    if isinstance(value, str) and not value.strip(): return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return str(value)

def row_from_mapping(row: dict[str, Any]) -> ManifestRow:
    return ManifestRow(
        sample_id=str(row.get("sample_id") or row.get("file_name") or Path(str(row.get("audio_path", "audio"))).stem),
        audio_path=str(row.get("audio_path") or row.get("file_name") or ""),
        source_dataset=str(row.get("source_dataset") or row.get("dataset") or "unknown"),
        species=normalize_label(row.get("species")) or "unknown",
        animal_id=normalize_identifier(row.get("animal_id")) or normalize_identifier(row.get("dog_id")) or normalize_identifier(row.get("cat_id")) or "unknown",
        breed=normalize_label(row.get("breed")),
        recording_session=row.get("recording_session"),
        duration_s=parse_optional_float(row.get("duration_s")),
        sample_rate=parse_optional_int(row.get("sample_rate")),
        vocalization=normalize_label(row.get("vocalization") or row.get("label")),
        context=normalize_label(row.get("context")),
        emotion=normalize_label(row.get("emotion")),
        arousal=parse_optional_float(row.get("arousal")),
        intent=normalize_label(row.get("intent")),
        license=str(row.get("license")) if row.get("license") else None,
    )

def validate_rows(rows: list[ManifestRow]) -> list[str]:
    errors: list[str] = []
    seen: set[str] = set()
    for idx, row in enumerate(rows):
        if row.sample_id in seen: errors.append(f"duplicate sample_id at row {idx}: {row.sample_id}")
        seen.add(row.sample_id)
        if not row.audio_path: errors.append(f"missing audio_path: {row.sample_id}")
        if row.species not in {"dog", "cat", "dog_cat", "unknown"}: errors.append(f"invalid species={row.species!r}: {row.sample_id}")
        if not row.animal_id or row.animal_id.lower() in {"unknown", "nan", "none", "null"}: errors.append(f"missing animal_id: {row.sample_id}")
        if row.duration_s is not None and not isinstance(row.duration_s, (int, float)): errors.append(f"invalid duration_s={row.duration_s!r}: {row.sample_id}")
        if row.sample_rate is not None and not isinstance(row.sample_rate, int): errors.append(f"invalid sample_rate={row.sample_rate!r}: {row.sample_id}")
        if row.arousal is not None and not isinstance(row.arousal, (int, float)): errors.append(f"invalid arousal={row.arousal!r}: {row.sample_id}")
    return errors

def write_jsonl(rows: list[ManifestRow], path: str | Path) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with Path(path).open("w", encoding="utf-8") as handle:
        for row in rows: handle.write(json.dumps(asdict(row), ensure_ascii=False) + "\n")
