# Setup local completo (antes del deploy)

Objetivo: tener **todas las features implementadas** funcionando en tu Mac + Telegram, y recién ahí subir a Vultr.

## Resumen en 4 pasos

```bash
bash scripts/local-setup.sh    # init + check env + verify DB
# Completar .env.local (ver tabla abajo)
npm run dev                    # T1
ngrok http 3000                # T2 → actualizar APP_BASE_URL
./scripts/set-webhook.sh https://TU-NGROK.ngrok-free.dev
```

---

## 1. Base obligatoria

| Variable | Dónde conseguirla |
|----------|-------------------|
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_WEBHOOK_SECRET` | Auto en `init-env.sh` |
| `SUPABASE_URL` | [Supabase](https://supabase.com) → API |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role |
| `MINIMAX_API_KEY` | [MiniMax](https://www.minimax.io) |
| `MIND_JWT_SECRET` | Auto en `init-env.sh` |
| `CRON_SECRET` | `openssl rand -hex 16` |
| `APP_BASE_URL` | Primero `http://localhost:3000`, luego **URL ngrok** |
| `AGENT_TOOLS_ENABLED` | `true` |

```bash
bash scripts/init-env.sh
npm run check:env
npm run verify:db
```

### Migraciones Supabase (una vez)

En SQL Editor, en orden:

`001` → `002` → `003` → `004` → `005` → `006`

O atajo si ya tenés 001–004: `supabase/migrations/RUN_005_006.sql`

---

## 2. Features opcionales (local)

| Feature | Variables | Cómo probar en Telegram |
|---------|-----------|-------------------------|
| **Web search** | `BRAVE_SEARCH_API_KEY` o `TAVILY_API_KEY` | `buscar clima mañana Santiago` o agente pregunta actual |
| **Google Calendar** | `GOOGLE_CLIENT_ID`, `SECRET`, `REDIRECT_URI` | `/connect google` → link → `/agenda` |
| **Cron** | `CRON_SECRET` | `./scripts/test-cron.sh` |
| **Runtime skills** | (tablas 005–006) | `quiero un skill…`, `/migrate-to-skills` |

Redirect Google en local:

```env
GOOGLE_REDIRECT_URI=https://TU-NGROK.ngrok-free.dev/api/oauth/google/callback
```

Tras cambiar ngrok, actualizá también en Google Cloud Console.

---

## 3. Features implementadas — checklist Telegram

Copiá y tachá mientras probás.

### Core

- [ ] `/start` — saludo + teclado
- [ ] Charla libre — responde con contexto
- [ ] `/memory` — hechos (esperá ~40s después de contar algo)
- [ ] `/mind` — abre grafo en el celular (requiere ngrok en `APP_BASE_URL`)
- [ ] `olvidá que …` — borra dato
- [ ] `/agent` — estado modo agente + tools

### Modo agente

- [ ] `¿Qué sabés de mí?` — usa memoria
- [ ] `¿Hablamos de X?` — busca chats viejos
- [ ] `clima en Santiago` — clima
- [ ] `buscar …` — web (si hay API key)

### Skills fijas

- [ ] `gasté 5000 en café` — skill gastos + botón Sí/No
- [ ] `Mis skills` — lista estados
- [ ] `¿Qué hacés hoy?` — plan_dia
- [ ] `/agenda` — calendario (con Google conectado)
- [ ] `/integrations` — estado integraciones

### Skills personalizados

- [ ] `quiero un skill que …` — crea skill
- [ ] `/skills` — lista
- [ ] `/migrate-to-skills` — guarda charla como skill
- [ ] `/export-skill nombre` — markdown
- [ ] `/curator` — archiva viejos
- [ ] Probar keyword del skill en mensaje natural

### Cron (terminal)

```bash
./scripts/test-cron.sh
```

---

## 4. Features en BACKLOG (no configurar aún)

| Feature | Estado |
|---------|--------|
| Browser automation | Código pendiente — VPS 4GB+ |
| MCP | Fase 3 |
| Voz (Groq) | Env listo, handler pendiente |
| Vision / nutrición | Pendiente |
| WhatsApp canal | Stub webhook |
| Spotify completo | Stub OAuth |
| Digest noticias LATAM | Fase 2 producto |

---

## Diagnóstico

```bash
curl -s http://localhost:3000/api/health | python3 -m json.tool
npm run check:env
npm run verify:db
```

| Problema | Fix |
|----------|-----|
| Bot no responde | `dev` + ngrok + `set-webhook.sh` |
| `runtime_skills` error | `npm run verify:db` → migración 005–006 |
| `/mind` localhost en celular | `APP_BASE_URL` = ngrok |
| MiniMax 429 | Límite cuenta; esperar ventana |
| Google OAuth falla | Redirect URI = ngrok + Console |

---

## Cuando todo esté ✅ → deploy

1. [docs/DEPLOY-VPS.md](./DEPLOY-VPS.md)
2. Vultr Cloud Compute 4 GB — São Paulo
3. Mismas env vars en el servidor
4. `APP_BASE_URL=https://tu-dominio-o-ip`
5. Pasar link del bot a los 9–10 testers

---

## Scripts útiles

| Comando | Qué hace |
|---------|----------|
| `bash scripts/local-setup.sh` | Setup guiado |
| `npm run check:env` | Variables |
| `npm run verify:db` | Tablas Supabase |
| `./scripts/set-webhook.sh URL` | Webhook Telegram |
| `./scripts/test-cron.sh` | Cron local |
