from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from ultralytics import YOLO

EXPECTED_KEYPOINTS = 24


def extract(model: YOLO, image_path: Path) -> np.ndarray:
    result = model(str(image_path), verbose=False)[0]
    if result.keypoints is None or result.keypoints.xy.shape[0] != 1:
        raise ValueError(f"expected exactly one detected dog pose in {image_path}")
    xy = result.keypoints.xy[0].cpu().numpy().astype(np.float32)
    if xy.shape != (EXPECTED_KEYPOINTS, 2):
        raise ValueError(f"expected {EXPECTED_KEYPOINTS} keypoints, got {xy.shape}")
    if getattr(result.keypoints, "conf", None) is not None:
        visibility = result.keypoints.conf[0].cpu().numpy().astype(np.float32)
    else:
        visibility = np.ones((EXPECTED_KEYPOINTS,), dtype=np.float32)
    if visibility.shape != (EXPECTED_KEYPOINTS,):
        raise ValueError(f"invalid keypoint confidence shape: {visibility.shape}")
    return np.concatenate([xy, visibility[:, None]], axis=1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract AnimalMind 24-point dog poses from images.")
    parser.add_argument("--model", required=True, help="Custom 24-keypoint canine pose checkpoint.")
    parser.add_argument("--images", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    model = YOLO(args.model)
    image_paths = sorted(p for p in args.images.rglob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if not image_paths:
        raise ValueError(f"no supported images found under {args.images}")

    args.output.mkdir(parents=True, exist_ok=True)
    success = 0
    failed = 0
    for image_path in image_paths:
        try:
            # Load first to catch corrupted files deterministically.
            with Image.open(image_path) as image:
                image.verify()
            keypoints = extract(model, image_path)
            np.save(args.output / f"{image_path.stem}.npy", keypoints)
            success += 1
        except Exception as exc:
            failed += 1
            print(f"SKIP {image_path}: {exc}")
    print({"success": success, "failed": failed, "output": str(args.output)})


if __name__ == "__main__":
    main()
