from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

import numpy as np


EPS = 1e-6


@dataclass(frozen=True)
class FeatureConfig:
    """Configuration for normalized animal pose features."""

    expected_keypoints: int = 24
    coordinate_dim: int = 3


def _as_array(keypoints: Sequence[Sequence[float]], cfg: FeatureConfig) -> np.ndarray:
    arr = np.asarray(keypoints, dtype=np.float32)
    if arr.ndim != 2 or arr.shape[1] not in (2, 3):
        raise ValueError("keypoints must have shape [N, 2] or [N, 3]")
    if arr.shape[0] != cfg.expected_keypoints:
        raise ValueError(
            f"expected {cfg.expected_keypoints} keypoints, got {arr.shape[0]}"
        )
    if arr.shape[1] == 2:
        arr = np.concatenate([arr, np.zeros((arr.shape[0], 1), dtype=np.float32)], axis=1)
    return arr


def normalize_keypoints(
    keypoints: Sequence[Sequence[float]],
    center_index: int,
    scale_indices: tuple[int, int],
    cfg: FeatureConfig = FeatureConfig(),
) -> np.ndarray:
    """Translate to a stable center and scale by a reference body segment."""
    arr = _as_array(keypoints, cfg)
    if not (0 <= center_index < len(arr)):
        raise IndexError("center_index out of range")
    a, b = scale_indices
    if not (0 <= a < len(arr) and 0 <= b < len(arr)):
        raise IndexError("scale_indices out of range")

    centered = arr - arr[center_index]
    scale = float(np.linalg.norm(arr[a] - arr[b]))
    if not np.isfinite(scale) or scale < EPS:
        scale = 1.0
    return centered / scale


def pair_distance(points: np.ndarray, a: int, b: int) -> float:
    return float(np.linalg.norm(points[a] - points[b]))


def angle_degrees(points: np.ndarray, a: int, vertex: int, b: int) -> float:
    """Return angle A-vertex-B in degrees."""
    va = points[a] - points[vertex]
    vb = points[b] - points[vertex]
    denom = (np.linalg.norm(va) * np.linalg.norm(vb)) + EPS
    cosine = float(np.clip(np.dot(va, vb) / denom, -1.0, 1.0))
    return float(np.degrees(np.arccos(cosine)))


def extract_geometric_features(
    keypoints: Sequence[Sequence[float]],
    *,
    center_index: int = 0,
    scale_indices: tuple[int, int] = (0, 1),
    cfg: FeatureConfig = FeatureConfig(),
) -> np.ndarray:
    """
    Build a model-friendly feature vector from normalized keypoints.

    The default indices are placeholders until the selected pose dataset's
    official 24-keypoint ordering is mapped into a named schema. No semantic
    body-part assumptions are made here.
    """
    normalized = normalize_keypoints(
        keypoints,
        center_index=center_index,
        scale_indices=scale_indices,
        cfg=cfg,
    )
    flat = normalized.reshape(-1)

    distances: list[float] = []
    step = max(1, len(normalized) // 8)
    anchors = list(range(0, len(normalized), step))[:8]
    for i in range(len(anchors) - 1):
        distances.append(pair_distance(normalized, anchors[i], anchors[i + 1]))

    angles: list[float] = []
    for i in range(1, len(anchors) - 1):
        angles.append(angle_degrees(normalized, anchors[i - 1], anchors[i], anchors[i + 1]) / 180.0)

    return np.concatenate(
        [flat.astype(np.float32), np.asarray(distances, dtype=np.float32), np.asarray(angles, dtype=np.float32)]
    )
