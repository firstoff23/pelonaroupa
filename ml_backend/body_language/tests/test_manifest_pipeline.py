import csv

import pytest

from ml_backend.body_language.dataset.merge_annotations import merge
from ml_backend.body_language.dataset.validate_manifest import validate


def write_csv(path, fieldnames, rows):
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def test_merge_requires_animal_id_and_preserves_blank_labels(tmp_path):
    pose = tmp_path / "pose.csv"
    annotations = tmp_path / "annotations.csv"
    output = tmp_path / "behavior.csv"
    write_csv(
        pose,
        ["sample_id", "image", "keypoints", "split"],
        [{"sample_id": "sample-1", "image": "a.jpg", "keypoints": "a.npy", "split": "train"}],
    )
    write_csv(
        annotations,
        ["sample_id", "animal_id", "posture", "head", "ears", "tail", "movement", "annotator", "source", "notes"],
        [{"sample_id": "sample-1", "animal_id": "dog-1", "posture": "standing", "head": "", "ears": "unknown", "tail": "high", "movement": "", "annotator": "human", "source": "custom", "notes": ""}],
    )

    result = merge(pose, annotations, output)
    assert result["merged_rows"] == 1
    report = validate(output)
    assert report["rows"] == 1
    assert report["head_unlabeled"] == 1
    assert report["movement_unlabeled"] == 1


def test_merge_rejects_empty_animal_id(tmp_path):
    pose = tmp_path / "pose.csv"
    annotations = tmp_path / "annotations.csv"
    write_csv(
        pose,
        ["sample_id", "image", "keypoints", "split"],
        [{"sample_id": "sample-1", "image": "a.jpg", "keypoints": "a.npy", "split": "train"}],
    )
    write_csv(
        annotations,
        ["sample_id", "animal_id", "posture", "head", "ears", "tail", "movement"],
        [{"sample_id": "sample-1", "animal_id": "", "posture": "", "head": "", "ears": "", "tail": "", "movement": ""}],
    )

    with pytest.raises(ValueError, match="animal_id"):
        merge(pose, annotations, tmp_path / "out.csv")
