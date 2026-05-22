# Animus

Compañero cognitivo personal en **Telegram** — memoria persistente, modo agente con tools, skills autocreados y grafo web `/mind`. Pensado para **la vida** (no para el trabajo).

Inspirado en el [AI Second Brain de Meta](https://medium.com/@AnalyticsAtMeta/how-we-built-an-ai-second-brain-for-60k-knowledge-workers-78c507dd795b): un asistente que te conoce, recuerda lo importante y crece con vos.

**Repositorio:** [github.com/ticoxz/Animus](https://github.com/ticoxz/Animus)

---

## Qué es

| | |
| --- | --- |
| **Producto** | Bot de Telegram que aprende de la charla, crea habilidades a medida y muestra tu “cerebro” en la web |
| **Público** | Vos, familia, amigos — multi-usuario desde el día uno |
| **Enfoque** | Vida cotidiana: comida, entreno, calendario, recordatorios, charla |
| **No es** | Un IDE, un bot de oficina ni una plataforma para desarrolladores |

Cada persona que escribe al bot tiene su propio perfil, memoria y skills en Supabase (`telegram_user_id`).

---

## Capacidades principales

### Modo agente (tools)

Con `AGENT_TOOLS_ENABLED=true` el modelo **usa herramientas** antes de responder:

| Tool | Uso |
| --- | --- |
| `search_memory_facts` | Perfil y hechos guardados |
| `search_past_chats` | “¿Qué hablamos de X?” |
| `get_calendar_events` | Leer Google Calendar |
| `create_calendar_event` | **Crear** eventos en Calendar desde el chat |
| `get_weather` | Clima (wttr.in) |
| `web_search` | Internet (Brave / Tavily / DuckDuckGo) |
| `list_my_skills` / `run_custom_skill` | Skills personalizados |

### Memoria y cerebro

- Extracción automática de hechos (throttle ~30s)
- `quién soy` → resumen corto en español (no volcado crudo del perfil)
- `/memory` → perfil completo + hechos recientes
- `/mind` → **grafo interactivo** (nodos, relaciones, búsqueda, zoom)
- Estilo de voz **por usuario** (ej. español paraguayo vs chileno)
- `olvidá X` — borrado selectivo

### Skills

| Tipo | Ejemplos |
| --- | --- |
| **Fijas** | `gastos`, `plan_dia`, reuniones, clima, búsqueda |
| **Personalizados** | “quiero un skill que…”, `/migrate-to-skills`, nudges post-tarea |
| **Por instrucciones** | Coach, dieta, gym — rol guardado sin API externa |

### Integraciones

- **Google Calendar** — OAuth, `/agenda`, `/agendar` (crear citas desde charla)
- **Clima** — wttr.in
- **Web search** — Brave / Tavily / DuckDuckGo
- **Cron** — briefing + curator de skills

Ver [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md).

---

## Arquitectura

```
Telegram
   │
   ▼
POST /api/telegram/webhook
   │
   ▼
lib/orchestrator ──► skills (registry) ──► runtime_skills
   │                      │
   │                      └──► lib/agent (loop + tools)
   │
   ├──► lib/memory (retrieve, extract, graph, voice-style)
   ├──► lib/llm (MiniMax / OpenAI + reglas español/Telegram)
   └──► Supabase (users, facts, entities, messages, skills)

Cron ──► /api/cron/proactive ──► briefing + curator
```

| Ruta | Función |
| --- | --- |
| `POST /api/telegram/webhook` | Mensajes y callbacks |
| `GET /api/cron/proactive` | Briefing + curator |
| `GET /api/health` | Estado + matriz de features |
| `GET /api/mind/graph` | JSON del grafo |
| `GET /api/mind/session?token=` | Login web desde Telegram |
| `/mind` | UI del grafo (force-graph, tema premium) |

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Runtime | **Next.js 15** (App Router, TypeScript, `standalone`) |
| Base de datos | **Supabase** (PostgreSQL) |
| LLM default | **MiniMax** (API compatible OpenAI) |
| LLM alternativo | OpenAI (`LLM_PROVIDER=openai`) |
| Canal | **Telegram Bot API** |
| Grafo | **react-force-graph-2d** |
| Producción | **VPS 24/7** (recomendado) o local + ngrok (dev) |

---

## Inicio rápido (local)

```bash
git clone https://github.com/ticoxz/Animus.git
cd Animus

bash scripts/local-setup.sh   # init + check:env + verify:db
# Completar .env.local (ver .env.example)

npm install
npm run dev
```

En otra terminal: `ngrok http 3000` → actualizar `APP_BASE_URL` → `./scripts/set-webhook.sh URL`

**Guía completa:** [docs/LOCAL-COMPLETO.md](./docs/LOCAL-COMPLETO.md) · [docs/PRUEBA-LOCAL.md](./docs/PRUEBA-LOCAL.md) · [docs/SETUP.md](./docs/SETUP.md)

### Supabase — migraciones

`001` → `006` en SQL Editor, o atajo `supabase/migrations/RUN_005_006.sql` si ya tenés `001`–`004`.

```bash
npm run verify:db
npm run check:env
```

### Google Calendar (opcional)

1. Google Cloud → OAuth Web → redirect `http://localhost:3000/api/oauth/google/callback` (o ngrok en prod)
2. Usuario de prueba en modo Testing
3. `.env.local`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
4. Telegram: `/connect google` → `/agenda` · `Drimo 25/5 a las 11` o `/agendar`

---

## Producción 24/7

VPS recomendado: **Vultr 4 GB** São Paulo o **Hetzner CPX21**. Guía: [docs/DEPLOY-VPS.md](./docs/DEPLOY-VPS.md)

```bash
git clone https://github.com/ticoxz/Animus.git /opt/animus
cp deploy/env.production.example .env
docker compose up -d --build
./scripts/vps-setup.sh https://tu-dominio.com
```

---

## Comandos Telegram

| Comando | Descripción |
| --- | --- |
| `/start` | Bienvenida + teclado |
| `/help` | Ayuda |
| `/memory` | Perfil completo |
| `/mind` | Link al grafo web |
| `/agent` | Estado modo agente |
| `/skills` | Skills personalizados |
| `/migrate-to-skills` | Charla → skill |
| `/export-skill nombre` | Export Markdown |
| `/curator` | Archivar skills viejos |
| `/integrations` | Integraciones |
| `/connect google` | OAuth Calendar |
| `/agenda` | Ver eventos |
| `/agendar` | Crear eventos desde charla |

Frases: `clima en Viña del Mar`, `hola quién soy`, `quiero un skill que…`, `anotá en el calendario…`

---

## Scripts npm

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Desarrollo |
| `npm run build` | Producción |
| `npm run check:env` | Validar env |
| `npm run verify:db` | Tablas Supabase |
| `npm run local:setup` | Setup guiado |

---

## Documentación

| Doc | Contenido |
| --- | --- |
| [docs/LOCAL-COMPLETO.md](./docs/LOCAL-COMPLETO.md) | Setup local + checklist |
| [docs/DEPLOY-VPS.md](./docs/DEPLOY-VPS.md) | Producción |
| [docs/RUNTIME-SKILLS.md](./docs/RUNTIME-SKILLS.md) | Skills personalizados |
| [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md) | Calendar, web, clima |
| [BACKLOG.md](./BACKLOG.md) | Roadmap |

---

## Roadmap (resumen)

| Fase | Estado |
| --- | --- |
| Telegram + memoria + `/mind` | ✅ |
| Modo agente + tools | ✅ |
| Skills + curator + migrate | ✅ |
| Google Calendar leer/crear | ✅ |
| Grafo web premium | ✅ |
| WhatsApp | 🔜 |
| Browser automation | 🔜 |

---

## Licencia

MIT
