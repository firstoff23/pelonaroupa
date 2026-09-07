"""
conftest.py — Mock heavy backend dependencies for testing classify endpoints.
All heavy deps (librosa, tensorflow, redis, asyncpg, supabase) are mocked
BEFORE app is imported, so tests only exercise the vision classifier path.
"""
import os
import sys
import types
from unittest.mock import MagicMock, patch
import pytest

# Testes locais não devem exigir segredos de produção.
os.environ.setdefault("ENVIRONMENT", "development")


def _make_mock(name: str):
    mod = types.ModuleType(name)
    mod.__spec__ = MagicMock()   # prevents ".__spec__ is not set" errors
    return mod


# Mock every heavy dep before app.py is imported
_HEAVY = [
    "asyncpg", "redis",
    "tensorflow", "tensorflow.python", "tensorflow.python.framework",
    "tensorflow_hub",
    "librosa", "librosa.core", "librosa.feature",
    "soundfile",
    "google", "google.generativeai",
    "supabase",
    "ultralytics",
]
for _name in _HEAVY:
    if _name not in sys.modules:
        sys.modules[_name] = _make_mock(_name)

# Also patch redis.from_url used at module level
sys.modules["redis"].from_url = MagicMock(return_value=MagicMock())


@pytest.fixture(autouse=True)
def mock_vision_inference(monkeypatch):
    """Keep route tests deterministic and independent of remote model downloads."""
    import app

    monkeypatch.setattr(
        app,
        "_get_species_classifier",
        lambda: lambda image: [{"label": "dog", "score": 0.99}],
    )
    fake_classifier = object()
    monkeypatch.setattr(app, "_get_dog_classifier", lambda: fake_classifier)
    monkeypatch.setattr(app, "_get_cat_classifier", lambda: fake_classifier)
    monkeypatch.setattr(app, "_dog_classifier", fake_classifier)
    monkeypatch.setattr(app, "_cat_classifier", fake_classifier)
    monkeypatch.setattr(
        app,
        "_run_breed_pipeline",
                    lambda classifier, image: [{"label": "Abyssinian", "score": 0.92}],

    )
    yield
