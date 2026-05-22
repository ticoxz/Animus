# Sesión de prueba local — como desarrollador

Guía rápida para **una tarde**. Para el checklist completo de features: [LOCAL-COMPLETO.md](./LOCAL-COMPLETO.md).

```bash
bash scripts/local-setup.sh
```

## Terminal 1 — proyecto

```bash
cd /Users/marcelomiranda/Desktop/sc

# Solo la primera vez
bash scripts/init-env.sh
# Editá .env.local → token Telegram, Supabase, OpenAI

npm run check:env
npm run dev
```

## Terminal 2 — túnel

```bash
brew install ngrok   # si no está
ngrok http 3000
```

Copiá la URL `https://....ngrok-free.app`

## Terminal 3 — webhook

```bash
cd /Users/marcelomiranda/Desktop/sc
./scripts/set-webhook.sh https://TU-URL-NGROK
```

## Telegram — checklist

| # | Mensaje | Esperado |
|---|---------|----------|
| 1 | `/start` | Saludo + teclado |
| 2 | `Me llamo Marcelo, vivo en CABA y laburo en tech` | Respuesta IA |
| 3 | *(esperar 40 s)* | — |
| 4 | `/memory` | Hechos guardados |
| 5 | `/mind` | Link al grafo |
| 6 | `gasté 5 lucas en café` | Oferta skill Gastos |
| 7 | Botón **Sí, activar** → repetir gasto | Confirmación Sí/No |
| 8 | `olvidá que laburo en tech` | Borra ese dato |
| 9 | `Mis skills` | Estados ✅/🔒 |

## Diagnóstico rápido

```bash
curl http://localhost:3000/api/health
npm run check:env
```

## Si algo falla

| Problema | Fix |
|----------|-----|
| Bot no responde | `npm run dev` + ngrok + `set-webhook.sh` de nuevo |
| "Falta Supabase" | `SUPABASE_*` en `.env.local` + migraciones 001–003 |
| IA genérica / sin IA | `OPENAI_API_KEY` |
| `/memory` vacío | Mensaje >8 chars, no comando; esperar 40s |
| Reiniciaste ngrok | URL nueva → `set-webhook.sh` otra vez |

## Sin ngrok (producción)

Vercel + mismas env vars + `APP_BASE_URL=https://tu-app.vercel.app` + webhook a esa URL.
