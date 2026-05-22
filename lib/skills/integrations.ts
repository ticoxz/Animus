import { listIntegrationsStatus } from "@/lib/integrations/catalog";
import {
  getGoogleAuthUrl,
  isGoogleConfigured,
  signOAuthState,
} from "@/lib/integrations/google/auth";
import { getOAuthToken } from "@/lib/db/oauth";
import type { SkillDefinition } from "@/lib/skills/base-skill";

export const integrationsSkill: SkillDefinition = {
  id: "core_chat",
  description: "Listar y conectar integraciones",
  matches: (text) =>
    text === "/integrations" ||
    text === "/integraciones" ||
    /^\/connect\s+/i.test(text) ||
    /integraciones/i.test(text),
  handle: async ({ user, text }) => {
    if (text === "/integrations" || text === "/integraciones") {
      return listIntegrationsStatus();
    }

    const connect = text.match(/^\/connect\s+(\w+)/i);
    if (connect) {
      const provider = connect[1].toLowerCase();
      if (provider === "google") {
        if (!isGoogleConfigured()) {
          const base =
            process.env.APP_BASE_URL ?? "http://localhost:3000";
          const redirect = `${base.replace(/\/$/, "")}/api/oauth/google/callback`;
          return (
            "Falta configurar <b>Google OAuth</b> en el servidor.\n\n" +
            "1. <a href=\"https://console.cloud.google.com/apis/credentials\">Google Cloud</a> → Credenciales → OAuth cliente Web\n" +
            "2. Redirect URI autorizada:\n<code>" +
            redirect +
            "</code>\n" +
            "3. En <code>.env.local</code>:\n" +
            "<code>GOOGLE_CLIENT_ID=...</code>\n" +
            "<code>GOOGLE_CLIENT_SECRET=...</code>\n" +
            "<code>GOOGLE_REDIRECT_URI=" +
            redirect +
            "</code>\n" +
            "4. Reiniciá <code>npm run dev</code>\n" +
            "5. Volvé a mandar /connect google"
          );
        }
        const existing = await getOAuthToken(user.id, "google");
        if (existing) {
          return "✅ Google ya conectado (Calendar + Gmail).";
        }
        const state = await signOAuthState(user.id);
        const url = getGoogleAuthUrl(state);
        return (
          "Conectá Google (Calendar + Gmail):\n" +
          url +
          "\n\nVálido 15 min. Después probá /agenda."
        );
      }
      if (provider === "spotify") {
        const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
        return (
          "Spotify: configurá SPOTIFY_CLIENT_ID en el servidor.\n" +
          `Luego: ${base}/api/oauth/spotify (próximamente en Telegram).`
        );
      }
      return "Conectores: google · spotify. Ej: /connect google";
    }

    return listIntegrationsStatus();
  },
};
