#!/usr/bin/env node
/**
 * Verifica tablas clave en Supabase (migraciones 001–006).
 * Uso: npm run verify:db
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const TABLES = [
  "users",
  "memory_facts",
  "user_entities",
  "messages_log",
  "runtime_skills",
  "skill_nudges",
  "user_oauth_tokens",
  "calendar_events_cache",
];

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("\n🗄️  Animus — verify Supabase\n");

  if (!url || !key) {
    console.log("❌ Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local\n");
    process.exit(1);
  }

  let ok = true;
  for (const table of TABLES) {
    const res = await fetch(
      `${url}/rest/v1/${table}?select=id&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );

    if (res.ok || res.status === 406) {
      console.log(`✅ ${table}`);
    } else if (res.status === 404 || res.status === 400) {
      const body = await res.text();
      if (body.includes("PGRST205") || body.includes("does not exist")) {
        console.log(`❌ ${table} — falta migración`);
        ok = false;
      } else {
        console.log(`⚠️  ${table} — HTTP ${res.status}`);
      }
    } else {
      console.log(`❌ ${table} — HTTP ${res.status}`);
      ok = false;
    }
  }

  console.log("");
  if (!ok) {
    console.log("Corré en Supabase SQL Editor los archivos en supabase/migrations/\n");
    console.log("Atajo: supabase/migrations/RUN_005_006.sql (si ya tenés 001–004)\n");
    process.exit(1);
  }
  console.log("✅ Base de datos lista\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
