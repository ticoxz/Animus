# Animus

Personal cognitive companion on **Telegram**. Inspired by [Meta's AI Second Brain](https://medium.com/@AnalyticsAtMeta/how-we-built-an-ai-second-brain-for-60k-knowledge-workers-78c507dd795b) — your memory, skills, and gentle proactivity in one voice.

**Repository:** [github.com/ticoxz/Animus](https://github.com/ticoxz/Animus)

## What Next.js does here

No mobile app in the MVP — **Next.js is the full backend**:

| Route | Role |
|-------|------|
| `POST /api/telegram/webhook` | Incoming bot messages |
| `GET /api/cron/proactive` | Scheduled nudges (Vercel Cron) |
| `GET /api/health` | Status |
| `app/page.tsx` | Optional status page |

Telegram is the product UI. Next.js = orchestrator + memory + skills + integrations.

```
Telegram  →  webhook  →  lib/orchestrator  →  skills / LLM / Supabase
Vercel Cron  →  /api/cron/proactive  →  same engine
```

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Vercel** (hosting + cron)
- **Supabase** (PostgreSQL, one row per `telegram_user_id`)
- **Telegram Bot API**
- **OpenAI** (chat; Whisper/Vision later)

## Local setup

```bash
cp .env.example .env.local
# TELEGRAM_BOT_TOKEN, SUPABASE_*, OPENAI_API_KEY

npm install
npm run dev
```

1. Create a [Supabase](https://supabase.com) project and run `supabase/migrations/001_initial.sql` and `002_memory_facts.sql`.
2. Create a bot with [@BotFather](https://t.me/BotFather) (display name: **Animus**).
3. Expose webhook (e.g. ngrok):

```bash
ngrok http 3000
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<NGROK>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

4. `/start` in Telegram — each user gets an isolated profile in `users`.

## Structure

```
app/api/          # HTTP backend
lib/
  orchestrator/   # Single brain
  channels/       # Telegram
  skills/         # gastos, reuniones, …
  memory/         # Profile + fact extraction
  llm/
  db/
supabase/
docs/
```

## Roadmap

1. Webhook + chat + keyboard
2. Memory extraction + `/memory`
3. Skill `gastos` with Yes/No confirmation
4. Google Calendar + `reuniones`
5. Vision + `nutricion`
6. Proactivity Level 2 per skill

See [mvp.md](./mvp.md), [BACKLOG.md](./BACKLOG.md), [docs/EVVA-PATTERNS.md](./docs/EVVA-PATTERNS.md).
