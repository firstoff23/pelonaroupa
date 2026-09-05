import io
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from PIL import Image
import torch
import torch.nn.functional as F

from schemas.breed import BreedClassificationResponse, Top3Item
from services.quality import assess_image_quality
from services.breed_knowledge import get_breed_info
from utils.cache import get_cached_inference, get_image_hash, set_cached_inference
from utils.auth import get_current_user


router = APIRouter(tags=["Breed Classification"], dependencies=[Depends(get_current_user)])


@router.post(
    "/classify-breed",
    response_model=BreedClassificationResponse,
    summary="Classificação detalhada de raça de cão ou gato com validação de qualidade",
)
async def classify_breed_v1(
    file: UploadFile = File(...),
    include_info: bool = Query(default=False, description="Incluir dados detalhados da raça"),
):
    """
    Classifica a raça de um pet (cão ou gato) a partir de uma fotografia.

    - **file**: Imagem (JPEG, PNG ou WebP, máx 10MB)
    - **include_info**: Se `true`, inclui descrição, temperamento, grupo e riscos de saúde.

    Retorna raça identificada, confiança, top 3 alternativas e metadados.
    """
    # 1. Validar Content-Type
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    ct = (file.content_type or "").lower()
    if ct not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de ficheiro não suportado '{ct}'. Permitidos: {sorted(allowed_types)}",
        )

    # 2. Validar Tamanho Máximo (10 MB)
    MAX_SIZE = 10 * 1024 * 1024
    image_bytes = await file.read()
    if len(image_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Ficheiro demasiado grande. O tamanho máximo permitido é 10 MB.",
        )

    # 3. Validar Magic Bytes Binários
    is_valid_magic = (
        image_bytes[:3] == b"\xff\xd8\xff"
        or image_bytes[:8] == b"\x89PNG\r\n\x1a\n"
        or (image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP")
    )
    if not is_valid_magic:
        raise HTTPException(
            status_code=415,
            detail="O conteúdo do ficheiro não corresponde a um formato de imagem válido.",
        )

    # 4. Validar Qualidade da Imagem (Blur & Iluminação - Variância do Laplaciano >= 100)
    is_acceptable, variance, quality_msg = assess_image_quality(image_bytes)
    if not is_acceptable:
        raise HTTPException(
            status_code=400,
            detail="A imagem está desfocada ou com pouca luz. Tira outra foto.",
        )

    # 5. Verificação de Cache (SHA-256 do binário da imagem)
    img_hash = get_image_hash(image_bytes)
    cache_key = f"v1:classify-breed:{img_hash}:{include_info}"
    
    # Import main app module dynamically to access shared model singletons & redis_conn
    import app as main_app

    cached_result = get_cached_inference(cache_key, redis_conn=main_app.redis_conn)
    if cached_result:
        return BreedClassificationResponse(**cached_result)

    # 6. Detect species first, then select the matching breed classifier
    t_start = time.perf_counter()
    try:
        from app import _get_species_classifier, _map_imagenet_to_species
        from app import _get_cat_classifier, _get_dog_classifier, _run_breed_pipeline

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        species_map = _map_imagenet_to_species(_get_species_classifier()(img))
        species = species_map["species"]
        if species == "unknown":
            raise HTTPException(status_code=422, detail="Não foi possível identificar cão ou gato.")

        classifier = _get_cat_classifier() if species == "cat" else _get_dog_classifier()
        results = _run_breed_pipeline(classifier, image_bytes)
        if not results:
            raise RuntimeError("O classificador não devolveu resultados")

        top3_items = [
            Top3Item(
                breed=main_app._clean_breed_label(str(item.get("label", "unknown"))),
                confidence=round(float(item.get("score", 0.0)), 3),
            )
            for item in results[:3]
        ]
        top_breed = top3_items[0].breed
        top_confidence = top3_items[0].confidence
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro durante a inferência: {exc}")

    elapsed_ms = (time.perf_counter() - t_start) * 1000.0

    # 9. Enriquecer com Informação da Raça (se solicitado)
    info = get_breed_info(top_breed, species=species) if include_info else None

    response_data = BreedClassificationResponse(
        breed=top_breed,
        confidence=top_confidence,
        species=species,
        top3=top3_items,
        info=info,
        processing_time_ms=round(elapsed_ms, 1),
    )

    # 10. Guardar em Cache
    set_cached_inference(cache_key, response_data.dict(), redis_conn=main_app.redis_conn)

    return response_data
