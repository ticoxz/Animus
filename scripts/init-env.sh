#!/usr/bin/env bash
# Crea .env.local con secretos locales generados (una sola vez).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env.local ]]; then
  echo "⚠️  .env.local ya existe — no lo piso."
  echo "   Borralo manualmente si querés regenerar."
  exit 0
fi

cp .env.example .env.local

WEBHOOK_SECRET=$(openssl rand -hex 16)
MIND_SECRET=$(openssl rand -hex 32)

if [[ "$(uname)" == "Darwin" ]]; then
  sed -i '' "s/^TELEGRAM_WEBHOOK_SECRET=.*/TELEGRAM_WEBHOOK_SECRET=${WEBHOOK_SECRET}/" .env.local
  sed -i '' "s/^MIND_JWT_SECRET=.*/MIND_JWT_SECRET=${MIND_SECRET}/" .env.local
  sed -i '' "s|^APP_BASE_URL=.*|APP_BASE_URL=http://localhost:3000|" .env.local
else
  sed -i "s/^TELEGRAM_WEBHOOK_SECRET=.*/TELEGRAM_WEBHOOK_SECRET=${WEBHOOK_SECRET}/" .env.local
  sed -i "s/^MIND_JWT_SECRET=.*/MIND_JWT_SECRET=${MIND_SECRET}/" .env.local
  sed -i "s|^APP_BASE_URL=.*|APP_BASE_URL=http://localhost:3000|" .env.local
fi

echo "✅ Creado .env.local"
echo ""
echo "Ahora editá .env.local y completá SOLO estas 4 líneas:"
echo "  TELEGRAM_BOT_TOKEN"
echo "  SUPABASE_URL"
echo "  SUPABASE_SERVICE_ROLE_KEY"
echo "  MINIMAX_API_KEY"
echo ""
echo "WEBHOOK_SECRET y MIND_JWT_SECRET ya están generados."
echo "Después: npm run check:env"
