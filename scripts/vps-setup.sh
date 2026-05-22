#!/usr/bin/env bash
# Post-deploy en VPS: webhook Telegram + health check
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "❌ Falta .env en el VPS (copiá deploy/env.production.example)"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source <(grep -v '^#' .env | sed 's/\r$//')
set +a

BASE="${APP_BASE_URL%/}"
if [[ -z "$BASE" || "$BASE" == *"localhost"* || "$BASE" == *"ngrok"* ]]; then
  echo "❌ APP_BASE_URL debe ser tu dominio público HTTPS (ej. https://animus.tudominio.com)"
  exit 1
fi

echo "→ Health"
curl -fsS "$BASE/api/health" | python3 -m json.tool 2>/dev/null || curl -fsS "$BASE/api/health"

echo ""
echo "→ Webhook Telegram"
./scripts/set-webhook.sh "$BASE"

echo ""
echo "✅ Listo. Probá /start en el bot."
echo "Cron (crontab -e):"
echo "*/15 * * * * curl -fsS -H \"Authorization: Bearer $CRON_SECRET\" $BASE/api/cron/proactive >/dev/null"
