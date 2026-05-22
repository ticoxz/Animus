# Toolsets e integraciones (filosofía Hermes)

Hermes organiza capacidades en **toolsets** (`web`, `memory`, `session_search`, `cronjob`, …).  
Animus expone el subset que encaja en Telegram + Next.js.

Docs Hermes: https://hermes-agent.nousresearch.com/docs/user-guide/features/tools

## Toolsets implementados

| Toolset Hermes | Tool Animus | Estado |
|----------------|-------------|--------|
| `memory` | `search_memory_facts`, `/memory` | ✅ |
| `session_search` | `search_past_chats` | ✅ |
| `web` | `web_search` | ✅ (ver proveedor abajo) |
| Calendar (integración) | `get_calendar_events`, `/agenda` | ✅ Google OAuth |
| Clima | `get_weather` | ✅ wttr.in |
| Skills | `list_my_skills`, `run_custom_skill`, `/skills` | ✅ |
| `cronjob` | briefing + proactive | ✅ parcial |
| `messaging` | Telegram webhook | ✅ |
| `browser` | — | BACKLOG |
| `terminal` | — | BACKLOG (VPS Docker) |
| MCP | — | Fase 3 |
| `delegate_task` | — | Fase 5 |

## Búsqueda web (`web_search`)

Hermes usa el toolset **`web`** (`web_search`, `web_extract`). No está atado a un proveedor.

En Animus configurás el backend con:

```env
SEARCH_PROVIDER=brave   # default
# SEARCH_PROVIDER=tavily
# SEARCH_PROVIDER=duckduckgo
```

| Proveedor | Variable |
|-----------|----------|
| `brave` | `BRAVE_SEARCH_API_KEY` |
| `tavily` | `TAVILY_API_KEY` |
| `duckduckgo` | sin key (límite bajo, solo dev) |

## Setup Google Calendar

1. [Google Cloud Console](https://console.cloud.google.com) → OAuth client
2. Redirect: `http://localhost:3000/api/oauth/google/callback`
3. `.env.local`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
4. Migración `004_integrations.sql`
5. Telegram: `/connect google` → `/agenda`

## Comandos Telegram

- `/hermes` — modo agente + tools activas
- `/integrations` — toolsets configurados
- `/connect google` — OAuth
- `/agenda` — calendario
- `/memory` · `/mind` · `/skills`
- `clima en {ciudad}` — clima

## VPS 24/7

Como Hermes en un `$5 VPS`: [DEPLOY-VPS.md](./DEPLOY-VPS.md)
