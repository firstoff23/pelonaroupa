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

---

## Resiliência Free Tier

### Keep-Alive (previne pausa após 7 dias)
- **Workflow:** `.github/workflows/supabase-keepalive.yml`
- **Frequência:** a cada 3 dias às 08:00 UTC
- **Mecanismo:** pedido HTTP ao REST API (`/rest/v1/`) com autenticação anon
- **Secrets necessários:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- **Ação manual:** Actions → Supabase Keep-Alive → Run workflow

### Backups diários
- **Workflow:** `.github/workflows/db-backup.yml`
- **Frequência:** diária às 04:00 UTC
- **Retenção:** 30 dias (limite do GitHub Artifacts no Free)
- **Secrets necessários:** `SUPABASE_DB_URL`
- **Como obter `SUPABASE_DB_URL`:**
  1. Supabase Dashboard → **Project Settings** → **Database**
  2. Na secção **Connection String**, selecionar o modo **URI** (Session mode: `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`)
  3. Substituir `[YOUR-PASSWORD]` pela password configurada da BD
  4. No GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret** com nome `SUPABASE_DB_URL`
- **Como restaurar um backup:**
  ```bash
  # Download do artifact na aba Actions, depois descompactar e carregar:
  gunzip -c pelonaroupa_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL"
  ```

### Tabela de Secrets Necessários

| Secret | Workflows que usam | Obrigatório / Opcional |
|---|---|---|
| `SUPABASE_URL` | keep-alive, db-size-check | Obrigatório para keep-alive |
| `SUPABASE_ANON_KEY` | keep-alive | Obrigatório para keep-alive |
| `SUPABASE_SERVICE_ROLE_KEY` | storage-cleanup, db-size-check | Opcional |
| `SUPABASE_DB_URL` | db-backup | Obrigatório para backups |
| `SUPABASE_ACCESS_TOKEN` | usage-monitor | Opcional |
| `DOCKER_USERNAME` | integration-tests | Recomendado |
| `DOCKER_TOKEN` | integration-tests | Recomendado |

