import asyncio
import json
import time
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

app = FastAPI()

@app.get('/health')
def health():
    return {'status': 'healthy'}

@app.get('/v1/ready')
def ready():
    return {'status': 'ready', 'vision_model_loaded': True, 'warmup_status': 'ready'}

@app.post('/v1/classify-breed')
async def classify_breed(file: UploadFile = File(...)):
    payload = await file.read()
    if not payload:
        return JSONResponse({'detail': 'empty file'}, status_code=400)
    # Simulate a small CPU inference boundary without claiming model accuracy.
    await asyncio.sleep(0.01)
    return {'species': 'dog', 'breed': 'synthetic-fixture', 'confidence': 0.0, 'model_source': 'local-load-test-mock', 'bytes': len(payload)}

@app.get('/sse')
async def sse():
    async def stream():
        yield 'event: connected\ndata: {"type":"connected"}\n\n'
        for _ in range(3):
            await asyncio.sleep(1)
            yield 'event: heartbeat\ndata: {"type":"heartbeat"}\n\n'
    return StreamingResponse(stream(), media_type='text/event-stream')

@app.get('/metrics')
def metrics():
    return 'animalmind_warmup_ready 1\nanimalmind_sse_clients 0\n'
