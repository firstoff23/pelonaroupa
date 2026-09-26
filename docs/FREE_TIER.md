# Estratégia de Free-Tier & Infraestrutura Efémera

Este documento detalha os limites, configurações e estratégias de execução em ambientes gratuitos (GitHub Actions, Supabase, Docker Hub).

---

## GitHub Actions — Testes de Integração

### Pré-requisitos (secrets necessários)

| Secret | Obrigatório? | Como obter |
|--------|:------------:|------------|
| `DOCKER_USERNAME` | Recomendado | Conta em https://hub.docker.com/signup |
| `DOCKER_TOKEN` | Recomendado | https://hub.docker.com/settings/security (scope `Read-only`) |

Sem estes secrets, o workflow pode falhar com rate limit do Docker Hub (100 pulls/6h anónimos partilhados pelos IPs dos runners do GitHub).

### Fallback
Se o workflow falhar, pode ser corrido manualmente via **Actions → Integration Tests → Run workflow**.

### Limitações conhecidas
- **Primeira execução:** ~5 min (download de imagens)
- **Execuções subsequentes (com cache):** ~1-2 min
- Se o Docker Hub devolver rate limit mesmo autenticado, aguardar 6h ou usar `supabase db start` (só Postgres)
