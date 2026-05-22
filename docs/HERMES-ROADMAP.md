# Usar el poder de Hermes en Animus

Referencia: https://github.com/nousresearch/hermes-agent

## Filosofía Hermes (5 pilares)

1. **Agent loop** — el modelo **usa tools**, no solo responde texto
2. **Memoria viva** — perfil + búsqueda en chats viejos + extracción continua
3. **Skills que evolucionan** — crear, usar, mejorar, archivar (curator)
4. **Siempre en servidor** — VPS 24/7, Telegram como interfaz
5. **Proactividad** — cron que actúa con contexto (calendario, briefing)

## Qué ya tenemos (paridad parcial)

| Pilar Hermes | Animus hoy |
|--------------|------------|
| VPS 24/7 | ✅ `docs/DEPLOY-VPS.md` |
| Telegram | ✅ |
| Memoria + grafo | ✅ Supabase + `/mind` |
| Skills autocreados | ✅ `runtime_skills` |
| Toolsets web + calendar | ✅ Google, clima, `web_search` multi-proveedor |
| Agent loop + tools | ✅ **Fase 1** (`lib/agent/`) |
| Buscar chats viejos | ✅ tool `search_past_chats` |
| Curator / SKILL.md | ✅ Fase 2 |
| MCP | 🔜 Fase 3 |
| Multi-plataforma | 🔜 Fase 4 |
| Subagentes | 🔜 Fase 5 |

## Cómo activar el “modo Hermes”

En `.env`:

```env
AGENT_TOOLS_ENABLED=true
```

Reiniciá la app. El bot pasa de “chat lineal” a **agente con herramientas** (como Hermes).

## Tools del agente (Fase 1)

| Tool | Equivalente Hermes |
|------|-------------------|
| `search_memory_facts` | Memoria / RAG lite |
| `search_past_chats` | FTS sesiones |
| `get_calendar_events` | Calendar tool |
| `get_weather` | Weather tool |
| `web_search` | Toolset `web` (brave / tavily / duckduckgo) |
| `run_custom_skill` | Runtime skills del usuario |
| `list_my_skills` | Skills registry |

El modelo decide cuándo llamarlas (no vos).

## Roadmap

### Fase 2 — Curator + agentskills.io ✅
- Export: `/export-skill nombre` → `SKILL.md` (agentskills.io)
- Curator: cron + `/curator` archiva sin uso 30d (`SKILL_CURATOR_DAYS`)
- Nudge post-tarea con botones Sí/No
- Restaurar: `/restore-skill nombre`

### Fase 3 — MCP
- `lib/mcp/` con 1–2 servers (filesystem read, web)

### Fase 4 — Gateway
- Discord / WhatsApp compartiendo orchestrator

### Fase 5 — Subagentes
- Tareas largas en background (cola Supabase)

## Lo que NO recomendamos

**Embeder el repo Python de Hermes dentro de Next.js** — dos runtimes, dos memorias, dos bots.

Mejor: **misma filosofía**, mismo stack TypeScript.

## Híbrido extremo (opcional)

Hermes en el VPS como proceso aparte + Animus solo UI — solo si necesitás los 40 tools ya. Mantenimiento doble.
