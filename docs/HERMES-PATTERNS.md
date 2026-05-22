# Patrones [Hermes Agent](https://github.com/nousresearch/hermes-agent)

Referencia oficial: https://hermes-agent.nousresearch.com/docs/

Animus es un **port TypeScript** de la filosofía Hermes para Telegram + Supabase, no un fork del repo Python.

## Pilares Hermes → Animus

| Hermes | Animus |
|--------|--------|
| Agent loop + tools | `lib/agent/run.ts` · `AGENT_TOOLS_ENABLED=true` |
| `memory` + perfil usuario | `memory_facts` + `users.profile` + `/memory` |
| `session_search` (FTS) | `search_past_chats` · `lib/memory/session-search.ts` |
| Skills autocreados + curator | `runtime_skills` · `/skills` · Fase 2 curator |
| Gateway Telegram 24/7 | `POST /api/telegram/webhook` + VPS |
| `cronjob` + delivery | `lib/cron/briefing.ts` + proactive |
| Toolset `web` | `web_search` · `SEARCH_PROVIDER` |
| Honcho dialectic memory | BACKLOG (plugin Honcho o equivalente) |
| MCP servers | Fase 3 |
| `delegate_task` subagentes | Fase 5 |
| Browser / terminal / 40 tools | BACKLOG (MCP o VPS sandbox) |

## Comandos alineados

| Hermes | Animus |
|--------|--------|
| `/new` `/reset` | `/reset` |
| `/skills` | `/skills` |
| `/memory` | `/memory` |
| `/model` | `LLM_PROVIDER` + MiniMax en `.env` |
| `hermes tools` | `/hermes` + `/integrations` |
| `hermes gateway` | webhook Telegram + `DEPLOY-VPS.md` |

## Qué no clonamos (a propósito)

- Repo Python + CLI `hermes` — mantenemos **un** runtime Next.js
- 40 tools built-in de golpe — toolset mínimo útil primero
- Nous Tool Gateway — opcional; vos ponés API keys directas

## Roadmap Hermes puro

Ver [HERMES-ROADMAP.md](./HERMES-ROADMAP.md) y [HERMES-COMPARISON.md](./HERMES-COMPARISON.md).
