export type NodeTypeKey =
  | "person"
  | "place"
  | "project"
  | "habit"
  | "emotion"
  | "other"
  | "fact";

export function resolveNodeType(type: string): NodeTypeKey {
  if (type.startsWith("fact:")) return "fact";
  const t = type as NodeTypeKey;
  return t in NODE_THEME ? t : "other";
}

export const NODE_THEME: Record<
  NodeTypeKey,
  { color: string; glow: string; label: string; icon: string }
> = {
  person: { color: "#5b6ee8", glow: "#9aa8ff", label: "Persona", icon: "◉" },
  place: { color: "#10b981", glow: "#5eead4", label: "Lugar", icon: "◎" },
  project: { color: "#d97706", glow: "#fbbf24", label: "Proyecto", icon: "◆" },
  habit: { color: "#9333ea", glow: "#c4b5fd", label: "Hábito", icon: "◇" },
  emotion: { color: "#e11d48", glow: "#fb7185", label: "Emoción", icon: "♡" },
  other: { color: "#64748b", glow: "#94a3b8", label: "Otro", icon: "○" },
  fact: { color: "#6366f1", glow: "#a5b4fc", label: "Hecho", icon: "✦" },
};

export function nodeRadius(factCount?: number, isSelected?: boolean): number {
  const base = 10 + Math.min((factCount ?? 0) * 1.5, 12);
  return isSelected ? base + 4 : base;
}

export function nodeColor(type: string): string {
  return NODE_THEME[resolveNodeType(type)].color;
}
