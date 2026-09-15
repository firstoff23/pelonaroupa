import numpy as np
import torch

from ml_backend.body_language.features import extract_geometric_features
from ml_backend.body_language.inference import decode_predictions
from ml_backend.body_language.model import BodyLanguageModel, HeadSpec, build_default_model


def test_feature_vector_is_finite_and_expected_size():
    keypoints = [[float(i), float(i % 5), 1.0] for i in range(24)]
    features = extract_geometric_features(keypoints)
    assert features.dtype == np.float32
    assert features.ndim == 1
    # 24 XY coordinates + 24 visibility values + 8 distances + 4 angles.
    assert features.shape == (84,)
    assert np.isfinite(features).all()


def test_default_model_matches_inference_label_counts():
    model = build_default_model(84)
    outputs = model(torch.randn(2, 84))
    assert set(outputs) == {"posture", "head", "ears", "tail", "movement"}
    assert outputs["posture"].shape == (2, 5)
    assert outputs["head"].shape == (2, 4)
    assert outputs["ears"].shape == (2, 5)
    assert outputs["tail"].shape == (2, 5)
    assert outputs["movement"].shape == (2, 5)


def test_custom_model_head_shapes_are_preserved():
    model = BodyLanguageModel(
        input_dim=84,
        heads=[HeadSpec("posture", 4), HeadSpec("head", 3)],
    )
    outputs = model(torch.randn(2, 84))
    assert outputs["posture"].shape == (2, 4)
    assert outputs["head"].shape == (2, 3)


def test_decode_predictions_returns_confidence():
    logits = {
        "posture": torch.tensor([[4.0, 0.0, 0.0, 0.0, 0.0]]),
        "head": torch.tensor([[0.0, 2.0, 0.0, 0.0]]),
    }
    result = decode_predictions(logits)
    assert result["posture"].label == "standing"
    assert result["head"].label == "neutral"
    assert 0.0 < result["posture"].confidence <= 1.0
