import torch

from ml_backend.body_language.features import extract_geometric_features
from ml_backend.body_language.inference import decode_predictions
from ml_backend.body_language.model import BodyLanguageModel, HeadSpec


def test_feature_vector_is_finite_and_stable():
    keypoints = [[float(i), float(i % 5), 0.0] for i in range(24)]
    features = extract_geometric_features(keypoints)
    assert features.dtype.name == "float32"
    assert features.ndim == 1
    assert torch.isfinite(torch.from_numpy(features)).all()


def test_model_has_five_prediction_heads():
    model = BodyLanguageModel(
        input_dim=79,
        heads=[
            HeadSpec("posture", 4),
            HeadSpec("head", 3),
            HeadSpec("ears", 4),
            HeadSpec("tail", 5),
            HeadSpec("movement", 5),
        ],
    )
    outputs = model(torch.randn(2, 79))
    assert set(outputs) == {"posture", "head", "ears", "tail", "movement"}
    assert outputs["posture"].shape == (2, 4)


def test_decode_predictions_returns_confidence():
    logits = {
        "posture": torch.tensor([[4.0, 0.0, 0.0, 0.0]]),
        "head": torch.tensor([[0.0, 2.0, 0.0]]),
    }
    result = decode_predictions(logits)
    assert result["posture"].label == "standing"
    assert 0.0 < result["posture"].confidence <= 1.0
