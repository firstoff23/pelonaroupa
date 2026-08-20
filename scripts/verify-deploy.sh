#!/usr/bin/env bash
# scripts/verify-deploy.sh
# Validação pós-deployment para Vercel.

set -euo pipefail

if [ -z "${VERCEL_TOKEN:-}" ]; then
    echo "❌ VERCEL_TOKEN não está disponível para validar o deployment."
    exit 1
fi

echo "🔍 Verificando variáveis de ambiente de produção..."
REQUIRED_VARS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "DATABASE_URL"
)

# The deployment runner does not expose project secrets as shell variables.
# Query Vercel's production environment by name instead of checking stale
# Next.js variable names locally.
if ! VERCEL_ENV_VARS="$(vercel env ls production --token="$VERCEL_TOKEN")"; then
    echo "❌ Não foi possível consultar as variáveis de ambiente no Vercel."
    exit 1
fi

MISSING=()
for VAR in "${REQUIRED_VARS[@]}"; do
    if [[ "$VERCEL_ENV_VARS" != *"$VAR"* ]]; then
        MISSING+=("$VAR")
    fi
done

if [ ${#MISSING[@]} -ne 0 ]; then
    echo "❌ Variáveis em falta: ${MISSING[*]}"
    exit 1
fi
echo "✅ Todas as variáveis necessárias estão configuradas."

echo "🏥 Verificando health check do backend..."
HEALTH_URL="${VITE_ML_BACKEND_URL:-https://firstoff-animalmind-backend.hf.space}/health"
HTTP_CODE="$(curl -fsS -o /dev/null -w "%{http_code}" "$HEALTH_URL")"
if [ "$HTTP_CODE" -ne 200 ]; then
    echo "❌ Health check falhou (HTTP $HTTP_CODE)"
    exit 1
fi
echo "✅ Backend saudável."

echo "✅ Deploy validado com sucesso!"
