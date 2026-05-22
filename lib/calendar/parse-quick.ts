export type ParsedEvent = {
  title: string;
  start: string;
  end: string;
  description?: string;
};

/** Parser local para frases tipo "Drimo lunes 25/5 a las 11" (sin depender del LLM). */
export function parseQuickSchedule(text: string): ParsedEvent[] {
  const dateM = text.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/);
  if (!dateM) return [];

  const day = Number(dateM[1]);
  const month = Number(dateM[2]);
  let year = dateM[3] ? Number(dateM[3]) : new Date().getFullYear();
  if (year < 100) year += 2000;

  const timeM =
    text.match(/(?:a\s+las?|hs?)\s*(\d{1,2})(?::(\d{2}))?/i) ??
    text.match(/\b(\d{1,2}):(\d{2})\b/);
  const hour = timeM ? Number(timeM[1]) : 11;
  const minute = timeM && timeM[2] ? Number(timeM[2]) : 0;

  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;

  const endDt = new Date(`${start}`);
  if (Number.isNaN(endDt.getTime())) return [];
  endDt.setHours(endDt.getHours() + 1);
  const end = `${year}-${pad(endDt.getMonth() + 1)}-${pad(endDt.getDate())}T${pad(endDt.getHours())}:${pad(endDt.getMinutes())}:00`;

  let title = "Reunión";
  if (/drimo/i.test(text)) {
    title = "Entrevista Drimo (Latam)";
  } else if (/mercado\s*libre|meli/i.test(text)) {
    title = "Mercado Libre — entrevista";
  } else {
    const words = text
      .replace(/\d{1,2}\s*\/\s*\d{1,2}.*$/i, "")
      .replace(
        /\b(anot[aá]r?|agend[aá]r?|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|a\s+las?)\b/gi,
        " ",
      )
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    if (words.length) title = words.slice(0, 4).join(" ");
  }

  return [{ title, start, end, description: text.slice(0, 200) }];
}
