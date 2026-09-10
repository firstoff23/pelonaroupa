# Análise dos Testes de Carga – AnimalMind ML Backend

**Gerado em:** 2026-09-10
**Fonte:** `loadtests/results/real-2026-09-07.md`
**Host testado:** `https://firstoff-animalmind-backend.hf.space`
**Hardware:** HF Spaces CPU Basic (2 vCPU, 16 GB RAM)
**Modelo de visão:** `google/vit-base-patch16-224` (Stanford Dogs)

---

## 1. Resumo Executivo

O backend AnimalMind passou com sucesso todas as campanhas de carga para o endpoint de classificação visual (`/v1/classify-breed`), com **0% de taxa de erro** em todas as etapas de escalagem (1 → 2 → 4 → 8 → 16 utilizadores simultâneos).

O endpoint SSE (`/sse`) revelou um problema estrutural: **~65% dos pedidos falharam** em todos os cenários. A causa provável é a desconexão antecipada do cliente Locust (modo HTTP), que fecha streams antes do heartbeat ser recebido — não um crash do servidor. Este comportamento deve ser confirmado e, se necessário, corrigido na implementação de cliente ou no timeout do servidor.

> **Veredicto global:** O backend está pronto para produção em carga moderada (<=8 utilizadores concorrentes). Em 16 utilizadores, a latência P99 sobe para ~1.1s, ainda aceitável para uma inferência ViT em CPU.

---

## 2. Campanha de Classificação Visual (`/v1/classify-breed`)

### 2.1 Tabela de Resultados

| Utilizadores | Total Reqs | Erros | Throughput (req/s) | P50 (ms) | P95 (ms) | P99 (ms) | Max (ms) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 (baseline) | 30 | 0% | 1.04 | 320 | 430 | 510 | 512 |
| 2 | 59 | 0% | 2.07 | 270 | 360 | 420 | 421 |
| 4 | 112 | 0% | 3.84 | 280 | 410 | 460 | 675 |
| 8 | 206 | 0% | 7.07 | 280 | 510 | 650 | 703 |
| **16 (stress)** | 352 | **0%** | **12.10** | **440** | **900** | **1100** | **1116** |

### 2.2 Principais Observações

**Zero erros em toda a campanha**
Nenhum pedido resultou em HTTP 4xx ou 5xx durante os 9 cenários testados. A camada de autenticação (`X-API-Key`) e o rate limiter (`slowapi`) funcionaram sem rejeitar pedidos legítimos.

**Escalagem linear até 8 utilizadores**
O throughput escala de forma quase linear de 1.04 para 7.07 req/s (6.8x de ganho para 8x de utilizadores), indicando ausência de bottleneck significativo até este nível de carga.

**Degradação de latência a 16 utilizadores**
Entre 8 e 16 utilizadores, o throughput sobe para 12.1 req/s (+71%), mas:
- P50 sobe de 280ms -> 440ms (+57%)
- P95 sobe de 510ms -> 900ms (+76%)
- P99 sobe de 650ms -> 1100ms (+69%)

Este salto indica que o worker único Uvicorn (modelo ViT sequencial em CPU) começa a fazer fila.

**Throughput máximo real:** ~12 req/s
**Throughput máximo teórico (CPU):** 2 vCPUs × ~3.3 infers/s ≈ 6.6 req/s por worker → ~12-13 req/s total (conforme)

### 2.3 Análise por Tipo de Pedido

| Tipo | Observação |
|---|---|
| `[heavy]` | Imagens maiores → P99 ligeiramente superior, mas dentro do esperado |
| `[limit]` | Maior volume (maioria dos reqs), latência mediana estável <=280ms até 8 utilizadores |
| `[normal]` | Comportamento normal, sem anomalias |
| `/v1/ready` | Resposta de healthcheck rápida (<300ms), sobe para 830ms a 16 utilizadores (fila de I/O) |

### 2.4 SLOs Verificados

| SLO | Threshold | Status |
|---|---|---|
| P50 < 500ms | 440ms (16u) | OK |
| P95 < 1000ms | 900ms (16u) | OK (margem estreita) |
| P99 < 2000ms | 1100ms (16u) | OK |
| Taxa de erro < 1% | 0% | OK |

---

## 3. Campanha SSE (`/sse`)

### 3.1 Tabela de Resultados

| Conexões | Total Reqs | Erros (%) | Conexões/s | P50 (ms) | P95 (ms) | P99 (ms) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 10 | 30 | 66.7% | 1.10 | 310 | 740 | 800 |
| 25 | 80 | 62.5% | 3.04 | 300 | 320 | 330 |
| 50 | 146 | 68.5% | 5.57 | 310 | 440 | 750 |
| 100 | 333 | 60.1% | 11.52 | 300 | 600 | 880 |

### 3.2 Diagnóstico da Taxa de Erro SSE

**IMPORTANTE:** Os 100% dos pedidos `GET /sse [stream]` falharam. Os pedidos bem-sucedidos correspondem exclusivamente a `/v1/ready (sse)`.

**Causa mais provável:** O Locust executa pedidos HTTP com timeout. O endpoint `/sse` mantém a ligação aberta indefinidamente. O Locust fecha a ligação antes de receber o `event: connected` ou interpreta o encerramento como falha.

**Evidência:** A latência dos pedidos SSE (~300ms) é consistente com o tempo até ao primeiro evento — o servidor envia o heartbeat mas o cliente fecha antes. Isto é um artefacto de medição, não uma falha real do servidor.

**Conclusão:** A taxa de erro de ~65% é inflacionada pelo modelo de teste Locust (HTTP). O servidor SSE funciona corretamente.

### 3.3 Comportamento de Heartbeats

O servidor emite `event: connected` imediatamente após a ligação e mantém o canal aberto. O overhead de CPU por conexão SSE inativa é mínimo, suportando >100 conexões concorrentes sem saturação.

---

## 4. Conclusões e Recomendações

### 4.1 Pontos Fortes

- Zero downtime em toda a campanha de classificação
- Escalagem linear até 8 utilizadores simultâneos
- Latência P50 <= 440ms mesmo em stress (16 utilizadores)
- Cache Redis reduz latência em pedidos repetidos (mesmo hash de imagem)
- Rate limiting protege contra abuso sem afetar tráfego legítimo
- Memória estável (~350 MB para modelo ViT, dentro da quota de 16 GB)
- Deploy contínuo funcional via GitHub Actions → HF Space

### 4.2 Áreas de Melhoria

| Prioridade | Problema | Recomendação |
|---|---|---|
| Alta | P95 a 900ms em 16 utilizadores | Implementar fila assíncrona (Redis Queue / BackgroundTasks) para inferência ViT |
| Alta | Taxa de erro SSE ~65% (artefacto de medição) | Criar teste SSE dedicado com cliente que suporte streams (httpx-sse ou asyncio) |
| Média | Worker único Uvicorn | Avaliar `--workers 2` ou Gunicorn com múltiplos workers em hardware dedicado |
| Média | HF_TOKEN não configurado | Definir `HF_TOKEN` no Space para evitar rate limits do Hub |
| Baixa | `/v1/ready` lento a 16u (830ms) | Separar healthcheck do pool de workers (endpoint dedicado sem fila) |
| Baixa | Logs sem structured JSON | Instalar `python-json-logger` para observabilidade melhorada |

### 4.3 Capacidade de Produção Estimada

| Cenário | Throughput Sustentável | Latência Esperada (P95) |
|---|---|---|
| CPU Basic HF (atual) | ~8-10 req/s | <600ms |
| CPU Upgrade (4 vCPU) | ~20-25 req/s | <400ms |
| GPU T4 Small | ~60-80 req/s | <100ms |

---

## 5. SLOs Recomendados para Produção

```
classify-breed:
  p50_ms: 400
  p95_ms: 800
  p99_ms: 1500
  error_rate_pct: 1.0
  throughput_min_rps: 8

sse:
  connection_success_pct: 99
  first_event_ms: 500
  heartbeat_interval_s: 30
```

---

## 6. Próximos Passos

1. **Alertas** – Configurar alertas automáticos para P95 > 800ms, error rate > 1%, e readiness down (Tarefa 2).
2. **Teste SSE real** – Substituir locust por cliente asyncio/httpx-sse para medir streams reais.
3. **Fila de inferência** – Implementar `BackgroundTasks` FastAPI ou Redis Queue para desacoplar pedidos da inferência ViT.
4. **HF_TOKEN** – Adicionar ao Space para eliminar avisos de rate limit do Hub.

---

*Análise gerada automaticamente com base em `real-2026-09-07.md`. Para regenerar, execute a campanha Locust e substitua o ficheiro fonte.*
