#!/usr/bin/env bash
# Prueba cron local (briefing + curator).
set -euo pipefail
cd "$(dirname "$0")/.."

read_env() {
  grep -E "^${1}=" .env.local 2>/dev/null | head -1 | cut -d= -f2- | sed 's/\r$//'
}

CRON_SECRET=$(read_env CRON_SECRET)
BASE=$(read_env APP_BASE_URL)
BASE="${BASE:-http://localhost:3000}"
BASE="${BASE%/}"

if [[ -z "$CRON_SECRET" ]]; then
  echo "❌ Falta CRON_SECRET en .env.local"
  echo "   Agregá: CRON_SECRET=$(openssl rand -hex 16)"
  exit 1
fi

echo "→ GET ${BASE}/api/cron/proactive"
curl -sS "${BASE}/api/cron/proactive" \
  -H "Authorization: Bearer ${CRON_SECRET}" | python3 -m json.tool 2>/dev/null || cat

echo ""
