#!/usr/bin/env bash
# Registra el webhook de Telegram.
# Uso: ./scripts/set-webhook.sh https://abc123.ngrok-free.app
set -euo pipefail
cd "$(dirname "$0")/.."

PUBLIC_URL="${1:-}"
if [[ -z "$PUBLIC_URL" ]]; then
  echo "Uso: ./scripts/set-webhook.sh <URL_PUBLICA>"
  echo "Ej:  ./scripts/set-webhook.sh https://abc123.ngrok-free.app"
  exit 1
fi

if [[ "$PUBLIC_URL" == *"xxxx"* ]]; then
  echo "❌ Usá la URL REAL de ngrok (no el ejemplo xxxx)"
  echo "   Corré: ngrok http 3000  y copiá la URL https://..."
  exit 1
fi

if [[ ! -f .env.local ]]; then
  echo "❌ Falta .env.local — corré: bash scripts/init-env.sh"
  exit 1
fi

read_env() {
  local key="$1"
  grep -E "^${key}=" .env.local | head -1 | cut -d= -f2- | sed 's/\r$//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

TELEGRAM_BOT_TOKEN=$(read_env TELEGRAM_BOT_TOKEN)
TELEGRAM_WEBHOOK_SECRET=$(read_env TELEGRAM_WEBHOOK_SECRET)

if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_WEBHOOK_SECRET" ]]; then
  echo "❌ TELEGRAM_BOT_TOKEN o TELEGRAM_WEBHOOK_SECRET vacíos en .env.local"
  echo "   Verificá que estén sin comillas y sin espacios alrededor del ="
  exit 1
fi

WEBHOOK_URL="${PUBLIC_URL%/}/api/telegram/webhook"

echo "→ Registrando webhook: $WEBHOOK_URL"

RESP=$(curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}&secret_token=${TELEGRAM_WEBHOOK_SECRET}")
echo "$RESP" | python3 -m json.tool 2>/dev/null || echo "$RESP"

echo ""
echo "→ Estado del webhook:"
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null
