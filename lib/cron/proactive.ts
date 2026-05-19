/**
 * Proactividad (Nivel 2): solo usuarios con skills active + proactive_enabled.
 * MVP stub: no envía nada hasta implementar reglas por skill.
 */
export async function runProactiveCron(): Promise<{
  ok: boolean;
  sent: number;
  message: string;
}> {
  const supabaseConfigured = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return {
    ok: true,
    sent: 0,
    message: supabaseConfigured
      ? "Cron OK — proactividad pendiente de skills Nivel 2"
      : "Cron OK — Supabase no configurado",
  };
}
