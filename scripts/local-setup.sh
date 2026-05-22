#!/usr/bin/env bash
# Guía rápida: stack local completo antes de deploy.
set -euo pipefail
cd "$(dirname "$0")/.."

echo ""
echo "🧠 Animus — setup local completo"
echo "================================"
echo ""

if [[ ! -f .env.local ]]; then
  echo "1️⃣  Creando .env.local..."
  bash scripts/init-env.sh
else
  echo "1️⃣  .env.local ya existe"
fi

echo ""
echo "2️⃣  Verificando variables..."
npm run check:env

echo ""
echo "3️⃣  Verificando Supabase (tablas)..."
npm run verify:db || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Siguiente (3 terminales):"
echo ""
echo "  T1:  npm run dev"
echo "  T2:  ngrok http 3000"
echo "       → copiá URL y en .env.local:"
echo "       APP_BASE_URL=https://TU-ID.ngrok-free.dev"
echo "  T3:  ./scripts/set-webhook.sh https://TU-ID.ngrok-free.dev"
echo ""
echo "Checklist Telegram: docs/LOCAL-COMPLETO.md"
echo "Probar cron:        ./scripts/test-cron.sh"
echo "Estado features:    curl localhost:3000/api/health | jq"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
