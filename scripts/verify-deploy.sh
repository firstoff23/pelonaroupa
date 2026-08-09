#!/bin/bash
# scripts/verify-deploy.sh
# Validação pós-deploy para Vercel

set -e

echo "🔍 Verificando variáveis de ambiente..."
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "DATABASE_URL"
)

MISSING=()
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ] && [ -z "$(vercel env ls $VAR --yes 2>/dev/null)" ]; then
        MISSING+=("$VAR")
    fi
done

if [ ${#MISSING[@]} -ne 0 ]; then
    echo "❌ Variáveis em falta: ${MISSING[*]}"
    exit 1
fi
echo "✅ Todas as variáveis estão configuradas."

echo "🏥 Verificando health check do backend..."
HEALTH_URL="${NEXT_PUBLIC_API_URL:-https://firstoff-animalmind-backend.hf.space}/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
if [ "$HTTP_CODE" -ne 200 ]; then
    echo "❌ Health check falhou (HTTP $HTTP_CODE)"
    exit 1
fi
echo "✅ Backend saudável."

echo "✅ Deploy validado com sucesso!"
