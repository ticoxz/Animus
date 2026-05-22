# Animus vs [Hermes Agent](https://github.com/nousresearch/hermes-agent)

Repo oficial: **https://github.com/nousresearch/hermes-agent** (Nous Research, MIT).

## Qué es Hermes

- Agente **self-improving**: crea y mejora **skills** con el uso
- **Gateway** multi-plataforma: Telegram, Discord, Slack, WhatsApp, Signal
- **40+ tools**, MCP, cron, subagentes, memoria (Honcho), búsqueda FTS en sesiones
- Estándar [agentskills.io](https://agentskills.io) para skills en Markdown
- Corre en VPS / serverless — no atado a tu laptop

## Qué es Animus (nosotros)

- **Producto consumer** LATAM en Telegram (opinión de fábrica, no lienzo dev)
- Next.js + Supabase + MiniMax (un solo deploy)
- Memoria relacional + grafo `/mind` + skills fijas + **runtime skills** (procedural memory Hermes)

## Paridad actual

| Capacidad Hermes | Animus |
|------------------|--------|
| Telegram gateway | ✅ |
| Memoria persistente | ✅ (perfil + facts + entidades) |
| Skills autocreados | ✅ parcial (`runtime_skills`, HTTP only) — ver [RUNTIME-SKILLS.md](./RUNTIME-SKILLS.md) |
| Skills Hub / install | ❌ |
| Curator (archivar skills viejos) | ✅ `/curator` + cron |
| SKILL.md (agentskills.io) | ✅ `/export-skill` + cache en DB |
| Nudge post-tarea | ✅ botones inline Telegram |
| Honcho / modelo de usuario dialectic | ❌ (tenemos perfil + extract) |
| FTS5 búsqueda en sesiones pasadas | ❌ (`messages_log` sin FTS aún) |
| Cron + delivery multi-plataforma | 🔧 briefing Google only |
| Agent loop + tools | ✅ `lib/agent/` (`AGENT_TOOLS_ENABLED=true`) |
| MCP servers | ❌ |
| 40+ tools (browser, code, etc.) | ❌ a propósito (MVP) |
| Discord / Slack / WhatsApp gateway | 🔧 WhatsApp stub |
| Subagentes paralelos | ❌ |
| `hermes skills install` | ❌ |

## Lo que copiamos del *concepto* Hermes

1. **Memory bank** — no inyectar todo el perfil; recuperar lo relevante (plan Animus)
2. **Skills que el agente crea** — `runtime_skills` (JSON + HTTP seguro); SKILL.md en Fase 2
3. **Telegram primero** — mismo canal de validación

## Roadmap “más Hermes” (si querés acercarte)

| Prioridad | Feature | Esfuerzo |
|-----------|---------|----------|
| 1 | Export/import skill como `SKILL.md` (agentskills.io) | Medio |
| 2 | Curator: archivar runtime skills sin uso 30 días | Bajo |
| 3 | FTS / búsqueda en `messages_log` (“¿qué hablamos de X?”) | Medio |
| 4 | Post-tarea: “¿Guardo esto como skill?” (nudge Hermes) | Bajo |
| 5 | MCP (1–2 servers) | Alto |
| 6 | Clonar gateway Hermes Python | Muy alto — no recomendado; mantener Next |

## No conviene clonar el repo entero

Hermes es **Python + SQLite local + gateway propio**. Animus es **TypeScript + Supabase + Vercel**.  
Mejor **puentear ideas** (skills, memoria, cron) que reescribir Hermes dentro de Next.

## Links

- Docs: https://hermes-agent.nousresearch.com/docs/
- Skills: https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- Memoria: https://hermes-agent.nousresearch.com/docs/user-guide/features/memory
