from __future__ import annotations

from dataclasses import dataclass

import torch
from torch import nn


@dataclass(frozen=True)
class HeadSpec:
    name: str
    num_classes: int


class BodyLanguageModel(nn.Module):
    """Small multi-head classifier for normalized pose features.

    Each head predicts one observable attribute. This keeps labels independent
    so a single image can represent, for example, a standing dog with ears
    forward and a raised tail.
    """

    def __init__(
        self,
        input_dim: int,
        heads: list[HeadSpec],
        hidden_dim: int = 256,
        dropout: float = 0.20,
    ) -> None:
        super().__init__()
        if input_dim <= 0:
            raise ValueError("input_dim must be positive")
        if not heads:
            raise ValueError("at least one prediction head is required")

        self.backbone = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
        )
        self.heads = nn.ModuleDict({
            spec.name: nn.Linear(hidden_dim, spec.num_classes) for spec in heads
        })
        self.head_specs = {spec.name: spec.num_classes for spec in heads}

    def forward(self, features: torch.Tensor) -> dict[str, torch.Tensor]:
        if features.ndim != 2:
            raise ValueError("features must have shape [batch, feature_dim]")
        hidden = self.backbone(features)
        return {name: head(hidden) for name, head in self.heads.items()}


def build_default_model(input_dim: int) -> BodyLanguageModel:
    return BodyLanguageModel(
        input_dim=input_dim,
        heads=[
            HeadSpec("posture", 4),
            HeadSpec("head", 3),
            HeadSpec("ears", 4),
            HeadSpec("tail", 5),
            HeadSpec("movement", 5),
        ],
    )
