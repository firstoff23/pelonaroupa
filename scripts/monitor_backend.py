#!/usr/bin/env python3
"""Monitor AnimalMind readiness and Prometheus metrics.

Usage:
  python scripts/monitor_backend.py
  ANIMALMIND_BACKEND_URL=http://127.0.0.1:8000 python scripts/monitor_backend.py

The script exits non-zero on unavailable health/readiness, an unready model,
malformed Prometheus output, or configured thresholds being exceeded.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass
class MonitorResult:
    base_url: str
    ready_status: int
    ready: dict
    metrics_status: int
    metrics: dict[str, float]
    duration_ms: float


def fetch(url: str, timeout: float) -> tuple[int, str]:
    request = Request(url, headers={"User-Agent": "animalmind-monitor/1.0", "Accept": "application/json, text/plain"})
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except URLError as exc:
        raise RuntimeError(f"request failed for {url}: {exc.reason}") from exc


def parse_metrics(text: str) -> dict[str, float]:
    values: dict[str, float] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "{" in line:
            continue
        parts = line.split()
        if len(parts) != 2:
            continue
        try:
            values[parts[0]] = float(parts[1])
        except ValueError:
            continue
    return values


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=os.getenv("ANIMALMIND_BACKEND_URL", "https://firstoff-animalmind-backend.hf.space"))
    parser.add_argument("--timeout", type=float, default=float(os.getenv("MONITOR_TIMEOUT_SECONDS", "15")))
    parser.add_argument("--max-sse-clients", type=int, default=int(os.getenv("MONITOR_MAX_SSE_CLIENTS", "90")))
    parser.add_argument("--max-ready-latency-ms", type=float, default=float(os.getenv("MONITOR_MAX_READY_LATENCY_MS", "5000")))
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")
    started = time.perf_counter()
    failures: list[str] = []

    try:
        health_status, health_body = fetch(f"{base_url}/health", args.timeout)
        if health_status != 200:
            failures.append(f"/health returned HTTP {health_status}: {health_body[:300]}")
    except RuntimeError as exc:
        failures.append(str(exc))
        health_status, health_body = 0, ""

    try:
        ready_status, ready_body = fetch(f"{base_url}/v1/ready", args.timeout)
        try:
            ready = json.loads(ready_body)
        except json.JSONDecodeError:
            ready = {"raw": ready_body[:300]}
            failures.append("/v1/ready returned invalid JSON")
        if ready_status != 200:
            failures.append(f"/v1/ready returned HTTP {ready_status}")
        if ready.get("vision_model_loaded") is not True:
            failures.append(f"vision_model_loaded={ready.get('vision_model_loaded')!r}")
        if ready.get("warmup_status") != "ready":
            failures.append(f"warmup_status={ready.get('warmup_status')!r}")
        if ready.get("warmup_error"):
            failures.append(f"warmup_error={ready['warmup_error']}")
    except RuntimeError as exc:
        failures.append(str(exc))
        ready_status, ready = 0, {}

    try:
        metrics_status, metrics_body = fetch(f"{base_url}/metrics", args.timeout)
        metrics = parse_metrics(metrics_body)
        if metrics_status != 200:
            failures.append(f"/metrics returned HTTP {metrics_status}")
        required = {"animalmind_sse_clients", "animalmind_warmup_ready"}
        missing = sorted(required - metrics.keys())
        if missing:
            failures.append(f"missing metrics: {', '.join(missing)}")
        if metrics.get("animalmind_warmup_ready") != 1:
            failures.append(f"animalmind_warmup_ready={metrics.get('animalmind_warmup_ready')!r}")
        sse_clients = metrics.get("animalmind_sse_clients")
        if sse_clients is not None and sse_clients > args.max_sse_clients:
            failures.append(f"animalmind_sse_clients={sse_clients} exceeds {args.max_sse_clients}")
    except RuntimeError as exc:
        failures.append(str(exc))
        metrics_status, metrics = 0, {}

    duration_ms = (time.perf_counter() - started) * 1000
    result = MonitorResult(base_url, ready_status, ready, metrics_status, metrics, duration_ms)
    output = {
        "ok": not failures,
        "base_url": result.base_url,
        "health_status": health_status,
        "ready_status": result.ready_status,
        "ready": result.ready,
        "metrics_status": result.metrics_status,
        "metrics": result.metrics,
        "duration_ms": round(result.duration_ms, 2),
        "failures": failures,
    }
    print(json.dumps(output, indent=2, sort_keys=True))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
