from __future__ import annotations

import argparse
import csv
from pathlib import Path

LABEL_COLUMNS = ["posture", "head", "ears", "tail", "movement"]
OUTPUT_COLUMNS = [
    "sample_id",
    "animal_id",
    "image",
    "keypoints",
    *LABEL_COLUMNS,
    "annotator",
    "source",
    "license",
    "notes",
]


def merge(pose_manifest: Path, annotations: Path, output: Path) -> None:
    with pose_manifest.open("r", encoding="utf-8", newline="") as fh:
        pose_rows = {row["sample_id"]: row for row in csv.DictReader(fh)}
    if not pose_rows:
        raise ValueError("pose manifest is empty")

    with annotations.open("r", encoding="utf-8", newline="") as fh:
        annotation_rows = list(csv.DictReader(fh))
    if not annotation_rows:
        raise ValueError("annotation manifest is empty")

    required = {"sample_id", "animal_id", *LABEL_COLUMNS, "annotator", "source", "license", "notes"}
    missing = required - set(annotation_rows[0])
    if missing:
        raise ValueError(f"annotation manifest is missing columns: {sorted(missing)}")

    seen: set[str] = set()
    merged: list[dict[str, str]] = []
    for annotation in annotation_rows:
        sample_id = annotation["sample_id"].strip()
        if not sample_id:
            raise ValueError("annotation has empty sample_id")
        if sample_id in seen:
            raise ValueError(f"duplicate annotation for sample_id {sample_id!r}")
        seen.add(sample_id)
        pose = pose_rows.get(sample_id)
        if pose is None:
            raise ValueError(f"annotation references unknown sample_id {sample_id!r}")

        animal_id = annotation["animal_id"].strip()
        if not animal_id:
            raise ValueError(f"sample {sample_id!r} has no animal_id; refusing leakage-prone training data")

        row = {
            "sample_id": sample_id,
            "animal_id": animal_id,
            "image": pose["image"],
            "keypoints": pose["keypoints"],
            **{column: annotation[column].strip() for column in LABEL_COLUMNS},
            "annotator": annotation["annotator"].strip(),
            "source": annotation["source"].strip(),
            "license": annotation["license"].strip(),
            "notes": annotation["notes"].strip(),
        }
        merged.append(row)

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(merged)

    print(f"wrote {len(merged)} annotated samples to {output}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge pose-only and behavior annotation manifests.")
    parser.add_argument("--pose-manifest", required=True, type=Path)
    parser.add_argument("--annotations", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    merge(args.pose_manifest, args.annotations, args.output)


if __name__ == "__main__":
    main()
