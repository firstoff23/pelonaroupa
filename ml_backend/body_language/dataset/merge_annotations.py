"""Merge pose-only manifests with independently annotated behavior labels.

The pose extractor produces geometry only. This step joins human or otherwise
approved behavior annotations; it never derives behavior labels from keypoints.
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

LABEL_COLUMNS = ("posture", "head", "ears", "tail", "movement")
ANNOTATION_COLUMNS = ("sample_id", "animal_id", *LABEL_COLUMNS)
OUTPUT_COLUMNS = (
    "sample_id",
    "image",
    "keypoints",
    "split",
    "animal_id",
    *LABEL_COLUMNS,
    "annotator",
    "source",
    "license",
    "notes",
)


def _read_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def merge(pose_manifest: Path, annotations: Path, output: Path) -> dict[str, int]:
    pose_rows = _read_rows(pose_manifest)
    annotation_rows = _read_rows(annotations)
    if not pose_rows:
        raise ValueError(f"pose manifest is empty: {pose_manifest}")
    if not annotation_rows:
        raise ValueError(f"annotations are empty: {annotations}")

    missing_pose = {"sample_id", "image", "keypoints", "split"} - set(pose_rows[0])
    missing_annotations = set(ANNOTATION_COLUMNS) - set(annotation_rows[0])
    if missing_pose:
        raise ValueError(f"pose manifest missing columns: {sorted(missing_pose)}")
    if missing_annotations:
        raise ValueError(f"annotations missing columns: {sorted(missing_annotations)}")

    annotations_by_sample: dict[str, dict[str, str]] = {}
    for row in annotation_rows:
        sample_id = row["sample_id"].strip()
        animal_id = row["animal_id"].strip()
        if not sample_id:
            raise ValueError("annotations contain an empty sample_id")
        if not animal_id:
            raise ValueError(
                f"annotation {sample_id!r} has no animal_id; refusing unsafe split"
            )
        if sample_id in annotations_by_sample:
            raise ValueError(f"duplicate annotation sample_id: {sample_id!r}")
        annotations_by_sample[sample_id] = row

    merged: list[dict[str, str]] = []
    unmatched_pose = 0
    for pose in pose_rows:
        sample_id = pose["sample_id"].strip()
        annotation = annotations_by_sample.get(sample_id)
        if annotation is None:
            unmatched_pose += 1
            continue
        row = {column: pose.get(column, "") for column in OUTPUT_COLUMNS}
        row.update(
            {
                "animal_id": annotation["animal_id"].strip(),
                **{
                    column: annotation.get(column, "").strip()
                    for column in LABEL_COLUMNS
                },
                "annotator": annotation.get("annotator", "").strip(),
                "source": annotation.get("source", "").strip(),
                "license": annotation.get("license", "").strip(),
                "notes": annotation.get("notes", "").strip(),
            }
        )
        merged.append(row)

    if not merged:
        raise ValueError("no pose rows matched behavioral annotations")

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(merged)

    return {
        "pose_rows": len(pose_rows),
        "annotation_rows": len(annotation_rows),
        "merged_rows": len(merged),
        "unmatched_pose_rows": unmatched_pose,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Join pose-only rows with approved behavior annotations."
    )
    parser.add_argument("--pose-manifest", required=True, type=Path)
    parser.add_argument("--annotations", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    print(merge(args.pose_manifest, args.annotations, args.output))


if __name__ == "__main__":
    main()
