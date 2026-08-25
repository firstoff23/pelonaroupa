# ADR-001: ML Backend Async Processing

**Status:** Proposed  
**Date:** 2026-08-25  
**Authors:** PeloNaRoupa Engineering

---

## Contexto

O endpoint `/classify` do ML backend (Fly.dev + HF Space) é síncrono. Quando um pedido de classificação de áudio chega:

1. O gateway Express (`server/routers.ts`) faz fetch para o ML backend.
2. O fetch aguarda a resposta (até `CLASSIFY_TIMEOUT_MS = 5000 ms`).
3. Durante esse tempo, o worker Node.js está bloqueado para esse pedido.

**Sintomas observados:**
- Picos de latência de 3–5 s visíveis nos Vercel Function logs.
- Timeout ocasional no HF Space (cold start ~10 s).
- Sob concorrência alta, o gateway pode ficar saturado.

---

## Problema

```
Client → Express (Node.js) → fetch(ML Backend) → [bloqueado 1–5 s] → resposta
```

O Express é single-threaded por worker. Se 10 utilizadores classificarem em simultâneo, todos os workers ficam ocupados aguardando o ML backend. Isto é o **bottleneck principal de escalabilidade**.

---

## Alternativas consideradas

### Opção A: BullMQ + Redis (recomendado para produção)
- **Como funciona:** Cliente envia áudio → gateway coloca job na fila Redis → worker ML processa → resultado via Polling/SSE.
- **Vantagens:** Retry automático, filas persistentes, dashboard (Bull Board), escala horizontalmente.
- **Desvantagens:** Requer Redis (custo ~$10/mês no Upstash ou Railway), complexidade de deploy.
- **Effort:** ~3 dias de desenvolvimento.

### Opção B: Celery + Redis (Python side)
- **Como funciona:** O FastAPI recebe o pedido e coloca numa fila Celery. O resultado é consultado via polling.
- **Vantagens:** Ecosistema Python nativo, suporte a tasks prioritárias.
- **Desvantagens:** Requer infra adicional (worker Celery sempre ativo no Fly.dev = custo extra).
- **Effort:** ~4 dias.

### Opção C: Cloudflare Queue / Vercel Queue
- **Como funciona:** Usar filas geridas pelo provider de hosting.
- **Vantagens:** Sem infra adicional, pay-per-use.
- **Desvantagens:** Vendor lock-in, latência de round-trip maior.

### Opção D: Manter síncrono com melhorias (decisão actual)
- **Como funciona:** Aumentar workers Express, melhorar timeout, adicionar retry com backoff.
- **Vantagens:** Zero infra adicional, deploy imediato.
- **Desvantagens:** Não resolve o problema de fundo sob carga alta.

---

## Decisão

**Para o MVP actual:** Manter processamento síncrono (Opção D) com melhorias de resiliência:
- O SSE (`_sse_subscribers`) já existe no `ml_backend/app.py` para push de resultados.
- O `CLASSIFY_TIMEOUT_MS` está em 5000 ms — suficiente para a maioria dos casos.
- O fallback primário→HF já existe em `resolveMlBackendUrls()`.

**Para V2.0 (pós-produção):** Migrar para BullMQ + Redis (Opção A).

---

## Plano de Migração para BullMQ (V2.0)

```
Phase 1 (semana 1):
  - Instalar: pnpm add bullmq ioredis
  - Criar server/_core/queue.ts com createQueue('classify') e createWorker
  - Adicionar endpoint /api/classify-async → { task_id: UUID }

Phase 2 (semana 2):
  - Endpoint /api/classify-status/:task_id → { status, result }
  - Frontend: polling a cada 1s via useQuery com retry
  - SSE opcional para resultados em tempo real

Phase 3 (semana 3):
  - Deploy Redis no Upstash (gratuito até 10k req/dia)
  - Migrar workers Fly.dev para processar da fila
  - Testes de carga com k6
```

---

## Consequências

- **Curto prazo:** Sem alteração. Performance aceitável para < 50 utilizadores concorrentes.
- **Médio prazo:** A migração para BullMQ aumentará a resiliência e permitirá retry automático.
- **Riscos:** Cold start no HF Space (10–30 s) continuará a causar timeouts ocasionais até a migração.
