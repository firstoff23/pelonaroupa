<<<<<<< HEAD
"""
loadtests/locustfile.py

Load test scenarios for PeloNaRoupa ML backend (HF Space / Fly.io).

Usage (against HF Space):
    # Set up env
    export IMAGE_PATH=./loadtests/fixtures/test-dog-synthetic.jpg
    export AUTH_TOKEN=<your TEST_AUTH_TOKEN GitHub secret>

    # Classify: normal load (1 user, 2 min)
    locust -f loadtests/locustfile.py --headless \
        --host=https://firstoff-animalmind-backend.hf.space \
        -u 1 -r 1 -t 2m --tags classify

    # Classify: scale up (repeat for 2, 4, 8, 16 users)
    locust -f loadtests/locustfile.py --headless \
        --host=https://firstoff-animalmind-backend.hf.space \
        -u 8 -r 2 -t 2m --tags classify

    # SSE: start with 10 concurrent connections
    locust -f loadtests/locustfile.py --headless \
        --host=https://firstoff-animalmind-backend.hf.space \
        -u 10 -r 1 -t 2m --tags sse

    # SSE: scale up (repeat for 25, 50, 75, 100 users)
    locust -f loadtests/locustfile.py --headless \
        --host=https://firstoff-animalmind-backend.hf.space \
        -u 50 -r 5 -t 2m --tags sse

    # Web UI (interactive):
    locust -f loadtests/locustfile.py \
        --host=https://firstoff-animalmind-backend.hf.space

Results are saved via --csv=loadtests/results/<scenario>-<date>
"""

import os
import time
import json
import threading
from pathlib import Path

from locust import HttpUser, task, between, tag, events
from locust.runners import MasterRunner, LocalRunner

# ── Configuration ──────────────────────────────────────────────────────────────

IMAGE_PATH = os.environ.get(
    "IMAGE_PATH", "loadtests/fixtures/test-dog-synthetic.jpg"
)
AUTH_TOKEN = os.environ.get("AUTH_TOKEN") or os.environ.get("ANIMALMIND_TEST_TOKEN", "")
API_KEY = os.environ.get("API_KEY", "")

# If AUTH_TOKEN does not look like a JWT (no dots), treat it as an API_KEY as well
if AUTH_TOKEN and "." not in AUTH_TOKEN and not API_KEY:
    API_KEY = AUTH_TOKEN

if not AUTH_TOKEN and not API_KEY:
    print(
        "[WARN] Neither AUTH_TOKEN nor API_KEY env var is set. "
        "Requests to protected endpoints will return 401."
    )

_IMAGE_BYTES: bytes | None = None


def get_image_bytes() -> bytes:
    """Lazy-load the fixture image once; cache in memory for all users."""
    global _IMAGE_BYTES
    if _IMAGE_BYTES is None:
        path = Path(IMAGE_PATH)
        if not path.exists():
            raise FileNotFoundError(
                f"Fixture image not found: {path.resolve()}\n"
                "Run: python loadtests/generate_fixture.py"
            )
        _IMAGE_BYTES = path.read_bytes()
    return _IMAGE_BYTES


# ── Breed Classification User ──────────────────────────────────────────────────


class ClassifyBreedUser(HttpUser):
    """
    Simulates a real user hitting /v1/classify-breed.
    Tagged "classify" — use --tags classify to run only this scenario.
    """

    wait_time = between(1, 3)  # 1–3 s between requests per user

    def on_start(self):
        self.headers = {}
        if AUTH_TOKEN:
            self.headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
        if API_KEY:
            self.headers["X-API-Key"] = API_KEY
        # Warm-up: check health first
        with self.client.get(
            "/v1/ready", headers=self.headers, catch_response=True, name="/v1/ready (warmup)"
        ) as resp:
            if resp.status_code not in (200, 503):
                resp.failure(f"Unexpected status: {resp.status_code}")

    @tag("classify")
    @task(5)
    def classify_normal(self):
        """Typical single-image classification (weight 5 — most frequent)."""
        image_bytes = get_image_bytes()
        with self.client.post(
            "/v1/classify-breed",
            files={"file": ("test-dog.jpg", image_bytes, "image/jpeg")},
            headers=self.headers,
            catch_response=True,
            name="/v1/classify-breed [normal]",
        ) as resp:
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    if "breed" not in data and "predictions" not in data:
                        resp.failure("Response missing breed/predictions field")
                except Exception:
                    resp.failure("Response is not valid JSON")
            elif resp.status_code == 429:
                resp.success()  # Rate limit is expected under heavy load
            else:
                resp.failure(f"HTTP {resp.status_code}")

    @tag("classify")
    @task(2)
    def classify_heavy(self):
        """Back-to-back classification with minimal wait (stress test)."""
        image_bytes = get_image_bytes()
        for _ in range(3):
            with self.client.post(
                "/v1/classify-breed",
                files={"file": ("test-dog.jpg", image_bytes, "image/jpeg")},
                headers=self.headers,
                catch_response=True,
                name="/v1/classify-breed [heavy]",
            ) as resp:
                if resp.status_code not in (200, 429):
                    resp.failure(f"HTTP {resp.status_code}")

    @tag("classify")
    @task(1)
    def classify_limit(self):
        """Pushes rate limits deliberately — expects 429 eventually."""
        image_bytes = get_image_bytes()
        hits_429 = False
        for _ in range(10):
            with self.client.post(
                "/v1/classify-breed",
                files={"file": ("test-dog.jpg", image_bytes, "image/jpeg")},
                headers=self.headers,
                catch_response=True,
                name="/v1/classify-breed [limit]",
            ) as resp:
                if resp.status_code == 429:
                    hits_429 = True
                    resp.success()
                elif resp.status_code != 200:
                    resp.failure(f"HTTP {resp.status_code}")
        # Log whether we successfully triggered rate-limiting
        if not hits_429:
            print("  [INFO] classify_limit: did not hit 429 - rate limit may be high")

    @tag("classify")
    @task(1)
    def health_check(self):
        """Lightweight health probe — should always be fast."""
        with self.client.get(
            "/v1/ready",
            headers=self.headers,
            catch_response=True,
            name="/v1/ready",
        ) as resp:
            if resp.status_code not in (200, 503):
                resp.failure(f"Unexpected health status: {resp.status_code}")


# ── SSE Connection User ────────────────────────────────────────────────────────


class SSEUser(HttpUser):
    """
    Simulates clients holding open /sse connections.
    Each user establishes one SSE connection and reads events for the test duration.
    Tagged "sse" — use --tags sse to run only this scenario.
    """

    # SSE users hold a connection for a long time — minimal additional wait
    wait_time = between(0.1, 0.5)

    def on_start(self):
        self.headers = {}
        if AUTH_TOKEN:
            self.headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
        if API_KEY:
            self.headers["X-API-Key"] = API_KEY
        self._sse_active = False

    @tag("sse")
    @task(3)
    def hold_sse_connection(self):
        """
        Opens an SSE stream and reads events/heartbeats for a few seconds.
        Measures stream connection latency, handshake, and error rates.
        """
        start = time.monotonic()
        events_received = 0
        read_duration = 3  # seconds per connection sample

        with self.client.get(
            "/sse",
            headers={**self.headers, "Accept": "text/event-stream"},
            stream=True,
            catch_response=True,
            name="/sse [stream]",
            timeout=10,
        ) as resp:
            if resp.status_code == 401:
                resp.failure("SSE: 401 Unauthorized")
                return
            if resp.status_code not in (200,):
                resp.failure(f"SSE: HTTP {resp.status_code}")
                return

            try:
                for line in resp.iter_lines(chunk_size=None):
                    if time.monotonic() - start > read_duration:
                        break
                    if line and line.startswith(b"data:"):
                        events_received += 1
            except Exception as exc:
                resp.failure(f"SSE stream error: {exc}")
                return

            resp.success()

    @tag("sse")
    @task(1)
    def sse_health(self):
        """Monitor server readiness while SSE connections are active."""
        with self.client.get(
            "/v1/ready",
            headers=self.headers,
            catch_response=True,
            name="/v1/ready (sse)",
        ) as resp:
            if resp.status_code not in (200, 503):
                resp.failure(f"Unexpected health status: {resp.status_code}")


# ── Event hooks for CSV export ─────────────────────────────────────────────────


@events.init.add_listener
def on_locust_init(environment, **kwargs):
    """Print instructions when Locust starts."""
    if isinstance(environment.runner, (MasterRunner, LocalRunner)):
        print("\n" + "=" * 60)
        print("PeloNaRoupa / AnimalMind Load Test")
        print(f"  IMAGE_PATH : {IMAGE_PATH}")
        print(f"  AUTH_TOKEN : {'SET [OK]' if AUTH_TOKEN else 'NOT SET [WARN]'}")
        print(f"  API_KEY    : {'SET [OK]' if API_KEY else 'NOT SET [WARN]'}")
        print("=" * 60 + "\n")


# ── Aliases for backwards compatibility ─────────────────────────────────────────
AnimalMindUser = ClassifyBreedUser
AnimalMindSSEUser = SSEUser

