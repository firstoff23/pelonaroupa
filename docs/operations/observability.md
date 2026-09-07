# Observabilidade operacional do AnimalMind

## Sinais públicos

`/health` mede disponibilidade do processo. `/v1/ready` mede prontidão funcional e só deve devolver HTTP 200 quando o modelo visual estiver carregado, o warm-up estiver concluído e as dependências declaradas estiverem ligadas.

A resposta de readiness inclui `vision_model_loaded`, `warmup_status` e `warmup_error`. O campo `warmup_error` deve ser tratado como diagnóstico operacional e nunca deve incluir tokens, cabeçalhos de autenticação ou conteúdo de imagens.

## Logs estruturados

O backend regista o início e o fim do warm-up, a origem do modelo carregado, erros de carregamento, ligações a PostgreSQL/Redis e o ciclo de vida dos clientes SSE. Os logs não devem incluir tokens, imagens, payloads multipart ou URLs com credenciais.

## Métricas mínimas

Antes de activar um fornecedor de alertas, recolhe pelo menos:

| Métrica | Dimensão | Sinal de atenção |
|---|---|---|
| Disponibilidade | `/health`, `/v1/ready` | Qualquer `/v1/ready` 503 persistente após warm-up |
| Latência | endpoint e status | P95/P99 acima do SLO definido |
| Erros | 4xx/5xx por rota | Aumento anormal de 5xx |
| Modelos | `warmup_status`, `model_source` | `failed`, fallback inesperado ou modelo desconhecido |
| SSE | clientes activos e desconexões | Aproximação ao limite de 100 ou filas crescentes |
| Recursos | CPU, RAM e reinícios | OOM, reinícios ou saturação sustentada |

## Política de análise

Os testes de carga devem ser executados separadamente para classificação e SSE. Não se deve comparar uma execução feita em CPU basic com uma execução feita em hardware diferente sem registar hardware, revisão do Space e revisão dos modelos. Cada incidente deve conter timestamp, commit, SHA do Space, modelo, rota afectada e amostra dos códigos HTTP, sem dados pessoais.

## Alertas externos futuros

A configuração de Slack, Grafana, Sentry ou outro fornecedor fica deliberadamente fora desta tranche. Quando for escolhida, as credenciais devem ser secrets do ambiente de deploy e o alerta deve apontar para `/v1/ready`, erros 5xx, latência e reinícios; nunca deve enviar imagens ou tokens para o sistema de alertas.
