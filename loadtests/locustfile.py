"""Opt-in load scenarios for AnimalMind.

Examples:
  IMAGE_PATH=./tests/fixtures/dog.jpg AUTH_TOKEN=... \
    locust -f loadtests/locustfile.py --headless -u 4 -r 1 -t 2m --tags classify

  AUTH_TOKEN=... locust -f loadtests/locustfile.py --headless \
    -u 25 -r 5 -t 5m --tags sse

Never commit AUTH_TOKEN or the image fixture used for a real run.
"""
from __future__ import annotations

import os
from pathlib import Path

from locust import HttpUser, between, task, tag


class AnimalMindUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self) -> None:
        self.auth_token = os.getenv("AUTH_TOKEN", "")
        image_path = os.getenv("IMAGE_PATH", "")
        if not image_path:
            raise RuntimeError("IMAGE_PATH must point to a non-sensitive test image")
        self.image_path = Path(image_path)
        if not self.image_path.is_file():
            raise FileNotFoundError(self.image_path)

    @tag("classify")
    @task
    def classify_breed(self) -> None:
        headers = {"Authorization": f"Bearer {self.auth_token}"} if self.auth_token else {}
        with self.image_path.open("rb") as image:
            self.client.post(
                "/v1/classify-breed",
                files={"file": (self.image_path.name, image, "image/jpeg")},
                headers=headers,
                name="/v1/classify-breed",
            )


class AnimalMindSSEUser(HttpUser):
    wait_time = between(1, 2)
    weight = 1

    def on_start(self) -> None:
        self.auth_token = os.getenv("AUTH_TOKEN", "")

    @tag("sse")
    @task
    def keep_sse_connection(self) -> None:
        headers = {"Authorization": f"Bearer {self.auth_token}"} if self.auth_token else {}
        with self.client.get(
            "/sse",
            headers=headers,
            stream=True,
            name="/sse",
            timeout=35,
            catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure(f"unexpected HTTP {response.status_code}")
                return
            # Read enough to prove the stream emits the initial event or heartbeat.
            first_chunk = next(response.iter_lines(), b"")
            if not first_chunk:
                response.failure("SSE stream produced no initial event")
