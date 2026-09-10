#!/usr/bin/env python3
"""Check AnimalMind backend SLOs against live /metrics and /v1/ready endpoints.

Exits with code 1 (and prints a JSON report) if any SLO threshold is breached.
Designed to be used in GitHub Actions; the calling workflow handles notifications.

SLOs checked:
  - /v1/ready must return HTTP 200 with vision_model_loaded=true and warmup_status='ready'
  - /v1/ready response time must be below MAX_READY_MS (default 5000ms)
  - animalmind_requests_total_error_rate must be below MAX_ERROR_RATE (default 0.01 = 1%)
  - animalmind_sse_clients must be below MAX_SSE_CLIENTS (default 90)
  - animalmind_warmup_ready must equal 1

Environment variables (all optional):
  ANIMALMIND_BACKEND_URL    Base URL of the backend (default: HF Space URL)
  MONITOR_TIMEOUT_SECONDS   HTTP timeout in seconds (default: 20)
  MAX_READY_MS              Max acceptable /v1/ready latency in ms (default: 5000)
  MAX_ERROR_RATE            Max acceptable error rate 0-1 (default: 0.01)
  MAX_SSE_CLIENTS           Max SSE clients before alert (default: 90)
  SLACK_WEBHOOK_URL         If set, post alert JSON to this Slack incoming webhook URL
"""
from __future__ import annotations

import json
import os
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fetch(url: str, timeout: float) -> tuple[int, str]:
    req = Request(url, headers={"User-Agent": "animalmind-slo-checker/1.0"})
    try:
        with urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", errors="replace")
    except HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except URLError as exc:
        raise RuntimeError(f"Network error for {url}: {exc.reason}") from exc


def _parse_metrics(text: str) -> dict[str, float]:
    """Parse plain-text Prometheus exposition format (no labels)."""
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


def _post_slack(webhook_url: str, payload: dict, timeout: float = 10.0) -> None:
    body = json.dumps(payload).encode()
    req = Request(webhook_url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=timeout):
            pass
    except Exception as exc:  # noqa: BLE001
        print(f"[WARN] Slack notification failed: {exc}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    base_url = os.getenv("ANIMALMIND_BACKEND_URL", "https://firstoff-animalmind-backend.hf.space").rstrip("/")
    timeout = float(os.getenv("MONITOR_TIMEOUT_SECONDS", "20"))
    max_ready_ms = float(os.getenv("MAX_READY_MS", "5000"))
    max_error_rate = float(os.getenv("MAX_ERROR_RATE", "0.01"))
    max_sse_clients = int(os.getenv("MAX_SSE_CLIENTS", "90"))
    slack_webhook = os.getenv("SLACK_WEBHOOK_URL", "")

    violations: list[str] = []
    info: dict = {"base_url": base_url, "checks": {}}

    # ── 1. Readiness check ──────────────────────────────────────────────────
    t0 = time.perf_counter()
    try:
        status, body = _fetch(f"{base_url}/v1/ready", timeout)
        ready_ms = (time.perf_counter() - t0) * 1000
        try:
            ready = json.loads(body)
        except json.JSONDecodeError:
            ready = {}
            violations.append("/v1/ready returned non-JSON body")

        info["checks"]["readiness"] = {
            "http_status": status,
            "latency_ms": round(ready_ms, 1),
            "vision_model_loaded": ready.get("vision_model_loaded"),
            "warmup_status": ready.get("warmup_status"),
        }

        if status != 200:
            violations.append(f"/v1/ready HTTP {status} (expected 200)")
        if ready.get("vision_model_loaded") is not True:
            violations.append(f"vision_model_loaded={ready.get('vision_model_loaded')!r} (expected true)")
        if ready.get("warmup_status") != "ready":
            violations.append(f"warmup_status={ready.get('warmup_status')!r} (expected 'ready')")
        if ready_ms > max_ready_ms:
            violations.append(f"/v1/ready latency {ready_ms:.0f}ms > threshold {max_ready_ms:.0f}ms")

    except RuntimeError as exc:
        violations.append(str(exc))
        info["checks"]["readiness"] = {"error": str(exc)}

    # ── 2. Metrics / SLOs ───────────────────────────────────────────────────
    try:
        m_status, m_body = _fetch(f"{base_url}/metrics", timeout)
        metrics = _parse_metrics(m_body)
        info["checks"]["metrics"] = {"http_status": m_status, "values": metrics}

        if m_status != 200:
            violations.append(f"/metrics HTTP {m_status} (expected 200)")

        # Error rate = errors / total (guard division by zero)
        total = metrics.get("animalmind_requests_total", 0)
        errors = metrics.get("animalmind_requests_error", 0)
        if total > 0:
            error_rate = errors / total
            info["checks"]["metrics"]["error_rate"] = round(error_rate, 4)
            if error_rate > max_error_rate:
                violations.append(
                    f"error_rate={error_rate:.2%} > threshold {max_error_rate:.2%} "
                    f"({int(errors)}/{int(total)} requests)"
                )

        # SSE client ceiling
        sse = metrics.get("animalmind_sse_clients")
        if sse is not None and sse > max_sse_clients:
            violations.append(f"animalmind_sse_clients={int(sse)} > threshold {max_sse_clients}")

        # Warmup guard
        if metrics.get("animalmind_warmup_ready") != 1.0:
            violations.append(f"animalmind_warmup_ready={metrics.get('animalmind_warmup_ready')!r} (expected 1)")

    except RuntimeError as exc:
        violations.append(str(exc))
        info["checks"]["metrics"] = {"error": str(exc)}

    # ── 3. Report ────────────────────────────────────────────────────────────
    ok = len(violations) == 0
    report = {
        "ok": ok,
        "violations": violations,
        **info,
    }
    print(json.dumps(report, indent=2, sort_keys=True))

    if not ok and slack_webhook:
        emoji = ":red_circle:"
        text = (
            f"{emoji} *AnimalMind SLO violation* – `{base_url}`\n"
            + "\n".join(f"  • {v}" for v in violations)
        )
        _post_slack(slack_webhook, {"text": text})

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
