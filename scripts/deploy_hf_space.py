"""Upload the production ML backend to a Hugging Face Space."""
from __future__ import annotations

import os
from pathlib import Path

from huggingface_hub import HfApi


space_id = os.environ.get("HF_SPACE_ID", "firstoff/animalmind-backend")
token = os.environ["HF_TOKEN"]
backend_dir = Path(__file__).resolve().parents[1] / "ml_backend"

if not (backend_dir / "app.py").is_file():
    raise SystemExit(f"Backend entrypoint not found: {backend_dir / 'app.py'}")

api = HfApi(token=token)
api.upload_folder(
    repo_id=space_id,
    repo_type="space",
    folder_path=str(backend_dir),
    path_in_repo="",
    commit_message="chore(deploy): sync backend from GitHub Actions",
    ignore_patterns=[
        "**/__pycache__/**",
        "**/*.pyc",
        "**/.pytest_cache/**",
        "**/.env*",
        "**/*.db",
        "feedback_images/**",
        "training/*.ipynb",
        "training/__pycache__/**",
        "tests/**",
    ],
)
print(f"Uploaded backend to {space_id}")
