from __future__ import annotations

import pytest

from pelotalk.data.ingest import normalize_rows
from pelotalk.data.manifest import row_from_mapping


def test_normalize_rows_fills_blank_source_dataset() -> None:
    rows = [
        {"sample_id": "s1", "audio_path": "a.wav", "species": "dog", "animal_id": "dog-1", "source_dataset": "   "},
        {"sample_id": "s2", "audio_path": "b.wav", "species": "dog", "animal_id": "dog-2", "source_dataset": "custom"},
    ]

    normalized = normalize_rows(rows, "dogspeak")

    assert normalized[0].source_dataset == "dogspeak"
    assert normalized[1].source_dataset == "custom"


def test_row_from_mapping_accepts_blank_optional_numeric_values() -> None:
    row = row_from_mapping(
        {
            "sample_id": "s1",
            "audio_path": "a.wav",
            "source_dataset": "dogspeak",
            "species": "dog",
            "animal_id": "dog-1",
            "duration_s": "",
            "sample_rate": " ",
            "arousal": "",
        }
    )

    assert row.duration_s is None
    assert row.sample_rate is None
    assert row.arousal is None


def test_row_from_mapping_preserves_and_validates_split() -> None:
    row = row_from_mapping(
        {
            "sample_id": "s1",
            "audio_path": "a.wav",
            "source_dataset": "dogspeak",
            "species": "dog",
            "animal_id": "dog-1",
            "split": "validation",
        }
    )
    assert row.split == "validation"

    blank = row_from_mapping(
        {
            "sample_id": "s2",
            "audio_path": "b.wav",
            "source_dataset": "dogspeak",
            "species": "dog",
            "animal_id": "dog-2",
            "split": " ",
        }
    )
    assert blank.split is None

    with pytest.raises(ValueError, match="invalid split"):
        row_from_mapping(
            {
                "sample_id": "s3",
                "audio_path": "c.wav",
                "source_dataset": "dogspeak",
                "species": "dog",
                "animal_id": "dog-3",
                "split": "dev",
            }
        )
