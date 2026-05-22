/** Normaliza nombres de ciudad para wttr.in */
export function normalizeWeatherCity(raw: string): { city: string; country?: string } {
  const t = raw.trim().toLowerCase();

  if (/viña|vina del mar|vina\b/.test(t)) {
    return { city: "Viña del Mar", country: "CL" };
  }
  if (/valpara[ií]so/.test(t)) {
    return { city: "Valparaíso", country: "CL" };
  }
  if (/santiago/.test(t)) {
    return { city: "Santiago", country: "CL" };
  }
  if (/asunc[ií]on/.test(t)) {
    return { city: "Asunción", country: "PY" };
  }

  const country = /\b(chile|cl)\b/i.test(raw) ? "CL" : undefined;
  return { city: raw.trim(), country };
}
