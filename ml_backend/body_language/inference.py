from __future__ import annotations

from dataclasses import dataclass

import torch

from .model import BodyLanguageModel


LABELS: dict[str, list[str]] = {
    "posture": ["standing", "sitting", "lying", "crouching"],
    "head": ["raised", "neutral", "lowered"],
    "ears": ["forward", "neutral", "backward", "unknown"],
    "tail": ["high", "neutral", "low", "tucked", "unknown"],
    "movement": ["still", "walking", "running", "shaking", "unknown"],
}


@dataclass(frozen=True)
class Prediction:
    label: str
    confidence: float


def decode_predictions(
    logits: dict[str, torch.Tensor],
    labels: dict[str, list[str]] = LABELS,
) -> dict[str, Prediction]:
    """Decode a single-sample model output into the API-safe representation."""
    predictions: dict[str, Prediction] = {}
    for head, values in logits.items():
        if head not in labels:
            raise KeyError(f"unknown prediction head: {head}")
        if values.ndim != 2 or values.shape[0] != 1:
            raise ValueError("decode_predictions expects logits shaped [1, num_classes]")
        if values.shape[1] != len(labels[head]):
            raise ValueError(f"label count mismatch for head '{head}'")
        probs = torch.softmax(values[0], dim=-1)
        index = int(torch.argmax(probs).item())
        predictions[head] = Prediction(
            label=labels[head][index],
            confidence=float(probs[index].item()),
        )
    return predictions


def predict(
    model: BodyLanguageModel,
    features: torch.Tensor,
) -> dict[str, Prediction]:
    model.eval()
    with torch.inference_mode():
        logits = model(features)
    return decode_predictions(logits)
