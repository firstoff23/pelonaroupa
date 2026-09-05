from __future__ import annotations

import argparse
import csv
from pathlib import Path

POSTURE_MAP = {
    "standing": "standing",
    "stand": "standing",
    "sitting": "sitting",
    "sit": "sitting",
    "lying": "lying",
    "lie": "lying",
}

FIELDS = [
    "sample_id",
    "animal_id",
    "image",
    "keypoints",
    "posture",
    "head",
    "ears",
    "tail",
    "movement",
    "source",
    "license",
]


def build(input_csv: Path, image_root: Path, keypoint_root: Path | None, output: Path, animal_column: str, image_column: str, posture_column: str) -> int:
    with input_csv.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        if not reader.fieldnames:
            raise ValueError("input CSV has no header")
        required = {animal_column, image_column, posture_column}
        missing = required - set(reader.fieldnames)
        if missing:
            raise ValueError(f"missing input columns: {sorted(missing)}")
        rows: list[dict[str, str]] = []
        for index, source_row in enumerate(reader, start=2):
            animal_id = source_row[animal_column].strip()
            image_name = source_row[image_column].strip()
            posture_raw = source_row[posture_column].strip().lower()
            if not animal_id or not image_name or not posture_raw:
                raise ValueError(f"row {index}: animal, image and posture are required")
            posture = POSTURE_MAP.get(posture_raw)
            if posture is None:
                raise ValueError(f"row {index}: unsupported posture {posture_raw!r}")
            image_path = image_root / image_name
            if not image_path.exists():
                raise FileNotFoundError(image_path)
            keypoints = ""
            if keypoint_root is not None:
                kp = keypoint_root / f"{Path(image_name).stem}.npy"
                if kp.exists():
                    keypoints = str(kp.as_posix())
            rows.append({
                "sample_id": f"mpdd-{index-1:05d}",
                "animal_id": animal_id,
                "image": str(image_path.as_posix()),
                "keypoints": keypoints,
                "posture": posture,
                "head": "",
                "ears": "",
                "tail": "",
                "movement": "",
                "source": "Mendeley:10.17632/v5j6m8dzhv.1",
                "license": "CC-BY-4.0",
            })
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert a labeled Multi-Pose Dog Dataset CSV to the AnimalMind manifest schema.")
    parser.add_argument("input_csv", type=Path)
    parser.add_argument("--image-root", type=Path, required=True)
    parser.add_argument("--keypoint-root", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/mpdd_manifest.csv"))
    parser.add_argument("--animal-column", default="animal_id")
    parser.add_argument("--image-column", default="image")
    parser.add_argument("--posture-column", default="posture")
    args = parser.parse_args()
    count = build(args.input_csv, args.image_root, args.keypoint_root, args.output, args.animal_column, args.image_column, args.posture_column)
    print({"rows_written": count, "output": str(args.output)})


if __name__ == "__main__":
    main()
