from __future__ import annotations

import argparse
import csv
from pathlib import Path

import numpy as np

KEYPOINTS = 24
DIMS = 3


def parse_pose_line(line: str) -> np.ndarray:
    parts = line.strip().split()
    if len(parts) < 5 + KEYPOINTS * DIMS:
        raise ValueError(f"invalid YOLO-pose row: expected at least {5 + KEYPOINTS * DIMS} values, got {len(parts)}")
    values = np.asarray([float(x) for x in parts[5 : 5 + KEYPOINTS * DIMS]], dtype=np.float32)
    return values.reshape(KEYPOINTS, DIMS)


def extract_pose(label_file: Path) -> np.ndarray:
    rows = [line for line in label_file.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not rows:
        raise ValueError(f"empty label file: {label_file}")
    # Dog-Pose contains one dog per image. Refuse ambiguous files rather than silently choosing one.
    if len(rows) != 1:
        raise ValueError(f"expected exactly one dog annotation in {label_file}, got {len(rows)}")
    return parse_pose_line(rows[0])


def image_for_label(label_path: Path, images_dir: Path) -> Path | None:
    stem = label_path.stem
    for suffix in (".jpg", ".jpeg", ".png", ".webp"):
        candidate = images_dir / f"{stem}{suffix}"
        if candidate.exists():
            return candidate
    return None


def prepare_split(root: Path, split: str, output_dir: Path) -> int:
    labels_dir = root / "labels" / split
    images_dir = root / "images" / split
    if not labels_dir.exists():
        raise FileNotFoundError(labels_dir)

    output_dir.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, str]] = []
    skipped = 0

    for label_path in sorted(labels_dir.glob("*.txt")):
        image_path = image_for_label(label_path, images_dir)
        if image_path is None:
            skipped += 1
            continue
        try:
            keypoints = extract_pose(label_path)
        except ValueError:
            skipped += 1
            continue

        pose_path = output_dir / f"{label_path.stem}.npy"
        np.save(pose_path, keypoints)
        rows.append(
            {
                "sample_id": label_path.stem,
                "image": str(image_path.as_posix()),
                "keypoints": str(pose_path.as_posix()),
                "split": split,
                # Behavior labels are deliberately absent here; add them in the annotation stage.
            }
        )

    manifest_path = output_dir / f"pose_manifest_{split}.csv"
    with manifest_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=["sample_id", "image", "keypoints", "split"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"{split}: wrote {len(rows)} samples to {manifest_path}; skipped {skipped}")
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert Ultralytics-style Dog-Pose labels to .npy + CSV manifests.")
    parser.add_argument("--root", required=True, type=Path, help="Dog-Pose dataset root containing images/ and labels/.")
    parser.add_argument("--output", default="data/pose", type=Path)
    parser.add_argument("--split", choices=["train", "val", "both"], default="both")
    args = parser.parse_args()

    splits = ["train", "val"] if args.split == "both" else [args.split]
    total = sum(prepare_split(args.root, split, args.output) for split in splits)
    print(f"total samples written: {total}")


if __name__ == "__main__":
    main()
