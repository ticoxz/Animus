# Animus en VPS (como Hermes)

Animus está pensado para correr **24/7 en un servidor**, no solo en tu Mac con ngrok.

```
Internet → Nginx (HTTPS) → Animus :3000 → Supabase + MiniMax + Telegram API
```

Supabase puede seguir en la nube (recomendado). El VPS solo corre la app Next.js.

---

## Requisitos VPS

| Recurso | Mínimo |
|---------|--------|
| RAM | 512 MB (1 GB cómodo) |
| CPU | 1 vCPU |
| Disco | 2 GB |
| OS | Ubuntu 22/24 LTS |
| Costo | ~USD 5/mes (Hetzner, DigitalOcean, etc.) |

---

## Opción A — Docker (recomendada)

```bash
# En el VPS
git clone https://github.com/ticoxz/Animus.git /opt/animus
cd /opt/animus

cp deploy/env.production.example .env
nano .env   # completar variables

docker compose up -d --build
bash scripts/vps-setup.sh
```

Nginx + SSL delante del puerto 3000 → ver `deploy/nginx/animus.conf.example`.

---

## Opción B — Node + systemd

```bash
cd /opt/animus
npm ci
npm run build

cp deploy/env.production.example .env
# editar .env

sudo cp deploy/systemd/animus.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now animus
```

Tras `npm run build`, el binario standalone queda en `.next/standalone/server.js`.

---

## Variables críticas en producción

```env
APP_BASE_URL=https://animus.tudominio.com   # NO localhost, NO ngrok
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
MIND_JWT_SECRET=...
CRON_SECRET=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
MINIMAX_API_KEY=...
```

`APP_BASE_URL` se usa para:

- Webhook Telegram
- Links `/mind` en el bot
- OAuth Google/Spotify

---

## Nginx + HTTPS

1. Apuntá DNS `animus.tudominio.com` → IP del VPS  
2. Copiá `deploy/nginx/animus.conf.example` → `/etc/nginx/sites-available/animus`  
3. `sudo certbot --nginx -d animus.tudominio.com`  
4. `bash scripts/vps-setup.sh`

---

## Cron (reemplaza Vercel Cron)

En el VPS, `crontab -e`:

```cron
*/15 * * * * curl -fsS -H "Authorization: Bearer TU_CRON_SECRET" https://animus.tudominio.com/api/cron/proactive >/dev/null
```

---

## Migraciones Supabase

Corré en Supabase SQL Editor (una vez):

`001` → `002` → `003` → `004` → `005`

---

## Actualizar versión

```bash
cd /opt/animus
git pull
docker compose up -d --build
# o: npm run build && sudo systemctl restart animus
bash scripts/vps-setup.sh
```

---

## Local vs VPS

| | Desarrollo (Mac) | Producción (VPS) |
|---|------------------|------------------|
| URL | ngrok + localhost | dominio HTTPS |
| Proceso | `npm run dev` | Docker o systemd |
| Cron | manual | crontab |
| Si apagás el Mac | bot muerto | bot sigue |

---

## Comparación con Hermes en VPS

| Hermes | Animus |
|--------|--------|
| `hermes gateway` en Python | `docker compose up` o systemd |
| SQLite local | Supabase cloud |
| Mismo concepto: **bot Telegram en servidor siempre prendido** | ✅ |
