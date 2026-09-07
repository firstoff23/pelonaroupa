"""Generate a provenance manifest without inventing benchmark values."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

DEFAULT_MODELS = {
    "species": "google/vit-base-patch16-224",
    "dog_breed": "firstoff/animalmind-breed-classifier",
    "cat_breed": "firstoff/animalmind-cat-classifier",
    "audio": "firstoff/animalmind-audio-classifier",
}


def sha256_files(root: Path) -> str | None:
    files = sorted(p for p in root.rglob("*") if p.is_file())
    if not files:
        return None
    digest = hashlib.sha256()
    for path in files:
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def hf_revision(model_id: str) -> str | None:
    try:
        with urlopen(f"https://huggingface.co/api/models/{model_id}", timeout=20) as response:
            payload = json.load(response)
        return payload.get("sha")
    except Exception:
        return None


def git_sha() -> str | None:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="artifacts/model_manifest.json")
    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    model_root = repo_root / "ml_backend" / "models"
    observed_runtime = os.getenv("ANIMALMIND_RUNTIME", "local-or-ci")

    models = []
    for name, model_id in DEFAULT_MODELS.items():
        local_dir = model_root / model_id.rsplit("/", 1)[-1]
        models.append(
            {
                "name": name,
                "model_id": model_id,
                "model_revision": hf_revision(model_id),
                "local_weights_sha256": sha256_files(local_dir) if local_dir.exists() else None,
                "metrics": {
                    "accuracy": None,
                    "macro_f1": None,
                    "balanced_accuracy": None,
                    "top3_accuracy": None,
                    "ece": None,
                    "abstention_rate": None,
                },
                "metrics_status": "not_confirmed_in_reproducible_run",
            }
        )

    manifest = {
        "manifest_version": 2,
        "status": "runtime_provenance_only_until_training_run_is_reproduced",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "backend_commit": git_sha(),
        "runtime": {
            "environment": observed_runtime,
            "python": platform.python_version(),
            "platform": platform.platform(),
            "hardware": os.getenv("ANIMALMIND_HARDWARE", "unknown"),
        },
        "models": models,
        "training": {
            "dataset_id": None,
            "dataset_revision": None,
            "split": None,
            "seed": None,
            "notes": "Populate from a reproduced training run before publishing benchmark claims.",
        },
    }
    output = repo_root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2) + "\n")
    print(output)


if __name__ == "__main__":
    main()
