from fastapi import APIRouter, HTTPException
from typing import Optional

from pydantic import BaseModel


router = APIRouter(tags=["Health & Readiness"])


class ReadinessResponse(BaseModel):
    status: str
    vision_model_loaded: bool
    db_connected: bool
    redis_connected: bool
    warmup_status: str
    warmup_error: Optional[str] = None


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    summary="Verifica se o backend e os modelos estão prontos a aceitar pedidos",
)
@router.head("/ready")
def ready_check():
    import app as main_app

    vision_loaded = main_app._vit_model is not None
    db_ok = main_app.db_pool is not None
    redis_ok = main_app.redis_conn is not None

    warmup = getattr(
        main_app,
        "vision_warmup",
        {"status": "unknown", "error": None},
    )
    status_str = "ready" if vision_loaded else warmup.get("status", "warming_up")

    res = ReadinessResponse(
        status=status_str,
        vision_model_loaded=vision_loaded,
        db_connected=db_ok,
        redis_connected=redis_ok,
        warmup_status=warmup.get("status", "unknown"),
        warmup_error=warmup.get("error"),
    )

    if not vision_loaded:
        # 503 Service Unavailable if model is not loaded yet
        raise HTTPException(status_code=503, detail=res.dict())

    return res
