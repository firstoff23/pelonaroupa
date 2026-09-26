from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import numpy as np

EPS = 1e-6

KEYPOINT_NAMES = (
    "front_left_paw", "front_left_knee", "front_left_elbow",
    "rear_left_paw", "rear_left_knee", "rear_left_elbow",
    "front_right_paw", "front_right_knee", "front_right_elbow",
    "rear_right_paw", "rear_right_knee", "rear_right_elbow",
    "tail_start", "tail_end", "left_ear_base", "right_ear_base",
    "nose", "chin", "left_ear_tip", "right_ear_tip",
    "left_eye", "right_eye", "withers", "throat",
)
IDX = {name: i for i, name in enumerate(KEYPOINT_NAMES)}

@dataclass(frozen=True)
class FeatureConfig:
    expected_keypoints: int = 24
    coordinate_dim: int = 3
    center: str = "withers"
    scale_pair: tuple[str, str] = ("withers", "throat")


def _as_array(keypoints: Sequence[Sequence[float]], cfg: FeatureConfig) -> np.ndarray:
    arr = np.asarray(keypoints, dtype=np.float32)
    if arr.ndim != 2 or arr.shape[0] != cfg.expected_keypoints or arr.shape[1] not in (2, 3):
        raise ValueError(f"keypoints must have shape [24, 2] or [24, 3], got {arr.shape}")
    if arr.shape[1] == 2:
        arr = np.concatenate([arr, np.ones((arr.shape[0], 1), dtype=np.float32)], axis=1)
    return arr


def normalize_keypoints(keypoints: Sequence[Sequence[float]], cfg: FeatureConfig = FeatureConfig()) -> np.ndarray:
    arr = _as_array(keypoints, cfg)
    center = arr[IDX[cfg.center], :2].copy()
    a = arr[IDX[cfg.scale_pair[0]], :2]
    b = arr[IDX[cfg.scale_pair[1]], :2]
    scale = float(np.linalg.norm(a - b))
    if not np.isfinite(scale) or scale < EPS:
        scale = 1.0
    out = arr.copy()
    out[:, :2] = (out[:, :2] - center) / scale
    # Preserve visibility separately; it must never be treated as a spatial coordinate.
    out[:, 2] = np.clip(out[:, 2], 0.0, 1.0)
    return out


def pair_distance(points: np.ndarray, a: str, b: str) -> float:
    return float(np.linalg.norm(points[IDX[a], :2] - points[IDX[b], :2]))


def angle_degrees(points: np.ndarray, a: str, vertex: str, b: str) -> float:
    va = points[IDX[a], :2] - points[IDX[vertex], :2]
    vb = points[IDX[b], :2] - points[IDX[vertex], :2]
    denom = np.linalg.norm(va) * np.linalg.norm(vb) + EPS
    cosine = float(np.clip(np.dot(va, vb) / denom, -1.0, 1.0))
    return float(np.degrees(np.arccos(cosine)))


def extract_geometric_features(keypoints: Sequence[Sequence[float]], cfg: FeatureConfig = FeatureConfig()) -> np.ndarray:
    p = normalize_keypoints(keypoints, cfg)

    # Spatial representation, excluding visibility from the geometric vector.
    xy = p[:, :2].reshape(-1)

    distances = np.asarray([
        pair_distance(p, "withers", "throat"),
        pair_distance(p, "tail_start", "tail_end"),
        pair_distance(p, "left_ear_base", "left_ear_tip"),
        pair_distance(p, "right_ear_base", "right_ear_tip"),
        pair_distance(p, "left_eye", "right_eye"),
        pair_distance(p, "nose", "chin"),
        pair_distance(p, "front_left_paw", "front_left_knee"),
        pair_distance(p, "front_right_paw", "front_right_knee"),
    ], dtype=np.float32)

    angles = np.asarray([
        angle_degrees(p, "left_ear_tip", "left_ear_base", "nose") / 180.0,
        angle_degrees(p, "right_ear_tip", "right_ear_base", "nose") / 180.0,
        angle_degrees(p, "tail_end", "tail_start", "withers") / 180.0,
        angle_degrees(p, "nose", "throat", "withers") / 180.0,
    ], dtype=np.float32)

    visibility = p[:, 2].astype(np.float32)
    return np.concatenate([xy.astype(np.float32), visibility, distances, angles])
