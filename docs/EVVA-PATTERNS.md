# Patrones tomados de [Evva](https://github.com/lacasoft/evva-ai)

**Licencia Evva:** MIT — si copiamos snippets literales, mantener copyright.

## Qué significaba “solo alerta OSS”

Antes **solo sabíamos por la web** que Evva existía (competidor). **No** habíamos leído ni pegado su código al scaffold inicial.

Ahora **sí adoptamos ideas** a propósito, reescritas para **Next.js** (no clonamos el monorepo Nest + Redis).

## Adoptado en este repo

| Evva | Nosotros |
|------|----------|
| `packages/skills` registry | `lib/skills/registry.ts` + `SkillDefinition` |
| `/memory` | `lib/skills/memory.ts` + “Qué sabés de mí” |
| `FactExtractionProcessor` (worker) | `lib/memory/extract-facts.ts` (async fire-and-forget) |
| `memory_facts` en Postgres | `supabase/migrations/002_memory_facts.sql` |
| `messages_log` | ya en 001 + `lib/db/messages.ts` |
| `/help`, `/reset` | en `core-chat.ts` |
| Daily briefing (worker) | pendiente → `lib/cron/proactive.ts` |

## No adoptado (aún) — diferencia a propósito

| Evva | Por qué no ahora |
|------|------------------|
| NestJS gateway + worker | Un solo Next.js para 2 usuarios |
| BullMQ + Redis | Overkill MVP; cron Vercel alcanza |
| pgvector + Voyage | Perfil JSON + facts; vector después si hace falta |
| 28 skills / 60 tools | Catálogo progresivo con consentimiento |
| WhatsApp, Gmail, Spotify | Fase 2+ |
| Runtime skill creator | BACKLOG Fase 2 |

## Nuestro foso vs Evva

- Skills con **Nivel 0–2** (no intrusivo)
- **plan_dia** sin GPS
- Fase 2 **noticias LATAM** (eventos, ofertas)
- Enfoque **consumidor** hermana/vos, no power-user dev
