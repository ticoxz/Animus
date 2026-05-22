# Animus — Setup guide

## 1. Supabase

1. Create project at [supabase.com](https://supabase.com)
2. SQL Editor → run in order:
   - `supabase/migrations/001_initial.sql`
   - `supabase/migrations/002_memory_facts.sql`
   - `supabase/migrations/003_memory_bank.sql`

## 2. Telegram bot

1. [@BotFather](https://t.me/BotFather) → `/newbot` → name **Animus**
2. Copy token → `TELEGRAM_BOT_TOKEN`

## 3. Environment

```bash
cp .env.example .env.local
```

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=random_string_here

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

MINIMAX_API_KEY=
MINIMAX_MODEL=MiniMax-M2.1

APP_BASE_URL=https://your-app.vercel.app
MIND_JWT_SECRET=long_random_secret

CRON_SECRET=another_random_string
```

## 4. Local dev

```bash
npm install
npm run dev
```

Expose webhook (ngrok):

```bash
ngrok http 3000
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<NGROK>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## 5. VPS (producción 24/7, recomendado)

Ver **[DEPLOY-VPS.md](./DEPLOY-VPS.md)** — Docker, Nginx, HTTPS, sin ngrok.

## 6. Vercel deploy (alternativa)

1. Import repo `ticoxz/Animus`
2. Add all env vars from `.env.example`
3. Deploy
4. Set webhook to `https://<your-app>.vercel.app/api/telegram/webhook`

## 6. Verify

- Message bot → `/start`
- `/memory` — profile + facts
- Chat about yourself → wait 30s → `/memory` again
- `/mind` → open graph in browser

## 7. Cron (optional)

Vercel runs `/api/cron/proactive` every 15 min (see `vercel.json`). Requires `CRON_SECRET` header from Vercel cron config.
