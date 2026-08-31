"""Free Kaggle training entry point for AnimalMind canine 24-keypoint pose.

This script fine-tunes the lightweight Ultralytics pose model on Dog-Pose.
Training is intentionally separate from the downstream Body Language classifier.

Kaggle setup:
- Accelerator: GPU
- Internet: enabled for the initial dataset/weight download
- Run from the repository root or adjust ROOT below.

Important licensing note:
The Dog-Pose source data is research-use restricted, and Ultralytics states that
use of its YOLO software/models in a proprietary/commercial product may require
an Enterprise license. This file is for free research/learning experiments.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO


DOG_POSE_YAML = "dog-pose.yaml"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="yolo26n-pose.pt")
    parser.add_argument("--data", default=DOG_POSE_YAML)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--project", default="runs/animalmind")
    parser.add_argument("--name", default="dog-pose-24kp")
    parser.add_argument("--device", default="0")
    args = parser.parse_args()

    model = YOLO(args.model)
    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=args.project,
        name=args.name,
        patience=15,
        workers=2,
        cache=False,
        amp=True,
        save=True,
        plots=True,
    )

    output_dir = Path(args.project) / args.name
    print(f"Training output: {output_dir.resolve()}")


if __name__ == "__main__":
    main()
