# AGENTS.md — Animus

## Product

**Animus**: proactive cognitive companion on Telegram (LATAM Spanish). Inspired by Meta's "Second Brain", consumer-focused.

## Stack

- Next.js 15 App Router = **backend** (API routes in `app/api/`)
- Supabase PostgreSQL = memory + users
- Telegram = UI
- MiniMax = LLM por defecto (API compatible OpenAI); OpenAI opcional (`LLM_PROVIDER=openai`)
- **Producción:** VPS + Docker/systemd + Nginx HTTPS (`docs/DEPLOY-VPS.md`). Dev local usa ngrok.

## Architecture

```
Telegram → webhook → lib/orchestrator → lib/skills/*
                    → lib/memory/retrieve (before LLM)
                    → extraction-queue (after reply, 30s throttle)
```

## Memory model

- `users.profile` — structured sections (demographic, interests, …)
- `memory_facts`, `user_entities`, `entity_relations` — graph + retrieval
- Do **not** dump full profile every request; use `retrieve.ts`

## Skills

Progressive activation: `locked` → `offered` → `active`. No proactive messages until user opts in (Nivel 2).

| Skill | Status |
|-------|--------|
| core_chat | always on |
| gastos | expense + inline confirm |
| plan_dia | daily plan questions |
| reuniones | not implemented |
| nutricion | not implemented |

## Web mind graph

- `/mind` — read-only force graph
- Auth via `/mind` command → JWT → cookie (15 min)

## Conventions

- Spanish LATAM, short messages, no tech jargon
- HTML in Telegram messages (`parse_mode: HTML`)
- No `Co-authored-by` in commits unless user asks

## Do not

- Add Obsidian sync (post-MVP)
- Multi-agent frameworks for MVP
- pgvector until explicitly requested
