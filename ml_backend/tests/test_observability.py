from fastapi.testclient import TestClient

from app import app


client = TestClient(app)


def test_metrics_endpoint_is_prometheus_compatible():
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "animalmind_requests_total" in response.text
    assert "animalmind_sse_clients" in response.text
    assert response.headers["content-type"].startswith("text/plain")


def test_readiness_exposes_warmup_state():
    response = client.get("/v1/ready")
    assert response.status_code in (200, 503)
    payload = response.json()
    body = payload.get("detail", payload)
    assert "vision_model_loaded" in body
    assert "warmup_status" in body
    assert "warmup_error" in body
