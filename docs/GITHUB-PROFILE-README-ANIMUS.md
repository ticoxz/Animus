# Sección para README de perfil GitHub (ticoxz/ticoxz)

Copiá este bloque en **Featured Projects**, después de Relay.

---

### 🧠 [Animus — Cognitive companion on Telegram](https://github.com/ticoxz/Animus)
*Personal AI second brain in Telegram: persistent memory, agent tools, custom skills, and an interactive knowledge graph — built for real life, not work dashboards.*

* **The Problem:** Chatbots forget context, mix languages, can't tie conversations to calendar or long-term goals, and don't give users a visual map of what they "know" about you.
* **The Solution:** A **Next.js 15** app with **Telegram webhook**, **Supabase** memory bank (facts, entities, relations), **MiniMax/OpenAI** agent loop with tools, **runtime skills** users create in natural language, and a **`/mind` web graph** (JWT from Telegram).
* **The Stack:** Next.js 15, TypeScript, Supabase, MiniMax API, Telegram Bot API, Google Calendar OAuth, react-force-graph-2d, Docker/VPS deploy.

**🔥 Key Features:**
* 🧠 **Agent mode:** `search_memory_facts`, past chats, weather, web search, Google Calendar read/create, custom skills.
* 📅 **Calendar:** OAuth + `/agenda` + natural language scheduling (`Drimo 25/5 at 11`).
* 🕸️ **Mind graph:** Interactive entity map with search, zoom, per-user style (e.g. Paraguayan Spanish).
* 🧩 **Runtime skills:** "I want a skill that…", migrate chat to skill, curator archives unused skills, SKILL.md export.
* 💾 **Memory:** Auto fact extraction, `/memory`, selective forget, identity answers as short summaries (not raw profile dumps).
* 🚀 **Deploy:** Local ngrok dev, Vultr/Hetzner VPS 24/7 — [full README](https://github.com/ticoxz/Animus).
