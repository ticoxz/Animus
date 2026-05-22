import {
  NODE_THEME,
  nodeRadius,
  resolveNodeType,
} from "@/app/mind/graph-theme";

export interface PaintNode {
  id: string;
  label: string;
  type: string;
  factCount?: number;
  degree?: number;
  x?: number;
  y?: number;
}

export interface PaintLink {
  source: PaintNode | string;
  target: PaintNode | string;
  relation: string;
}

function linkEndpoints(link: PaintLink): {
  src: PaintNode;
  tgt: PaintNode;
} | null {
  const src = link.source;
  const tgt = link.target;
  if (typeof src === "string" || typeof tgt === "string") return null;
  if (src.x == null || tgt.x == null) return null;
  return { src, tgt };
}

export function computeDegrees(
  nodes: PaintNode[],
  links: PaintLink[],
): Map<string, number> {
  const deg = new Map<string, number>();
  for (const n of nodes) deg.set(n.id, 0);
  for (const l of links) {
    const ends = linkEndpoints(l);
    if (!ends) {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      deg.set(s, (deg.get(s) ?? 0) + 1);
      deg.set(t, (deg.get(t) ?? 0) + 1);
      continue;
    }
    deg.set(ends.src.id, (deg.get(ends.src.id) ?? 0) + 1);
    deg.set(ends.tgt.id, (deg.get(ends.tgt.id) ?? 0) + 1);
  }
  return deg;
}

export function effectiveRadius(node: PaintNode, selectedId: string | null): number {
  const hub = Math.min((node.degree ?? 0) * 1.2, 8);
  return nodeRadius(node.factCount, node.id === selectedId) + hub;
}

/** Rejilla + viñeta detrás del grafo */
export function paintFrameBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.save();

  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.65,
  );
  vignette.addColorStop(0, "rgba(8, 10, 22, 0)");
  vignette.addColorStop(1, "rgba(4, 5, 12, 0.85)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  const step = 28;
  ctx.fillStyle = "rgba(124, 140, 255, 0.04)";
  for (let x = 0; x < width; x += step) {
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function paintLink(
  link: PaintLink,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  selectedId: string | null,
  hoveredId: string | null,
) {
  const ends = linkEndpoints(link);
  if (!ends) return;

  const { src, tgt } = ends;
  const sx = src.x!;
  const sy = src.y!;
  const tx = tgt.x!;
  const ty = tgt.y!;

  const active =
    selectedId &&
    (src.id === selectedId ||
      tgt.id === selectedId ||
      src.id === hoveredId ||
      tgt.id === hoveredId);

  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const curve = Math.min(dist * 0.12, 40);
  const cx = mx + nx * curve;
  const cy = my + ny * curve;

  const grad = ctx.createLinearGradient(sx, sy, tx, ty);
  if (active) {
    grad.addColorStop(0, "rgba(124, 140, 255, 0.85)");
    grad.addColorStop(0.5, "rgba(167, 139, 250, 0.55)");
    grad.addColorStop(1, "rgba(52, 211, 153, 0.65)");
  } else {
    grad.addColorStop(0, "rgba(124, 140, 255, 0.12)");
    grad.addColorStop(1, "rgba(148, 163, 184, 0.08)");
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(cx, cy, tx, ty);
  ctx.strokeStyle = grad;
  ctx.lineWidth = (active ? 2.2 : 0.9) / globalScale;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function drawLabelPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  globalScale: number,
  highlight: boolean,
) {
  const fontSize = Math.max(10 / globalScale, 3);
  ctx.font = `500 ${fontSize}px var(--font-mind), system-ui, sans-serif`;
  const metrics = ctx.measureText(text);
  const padX = 6 / globalScale;
  const padY = 3 / globalScale;
  const w = metrics.width + padX * 2;
  const h = fontSize + padY * 2;
  const rx = x - w / 2;
  const ry = y - h / 2;
  const r = 4 / globalScale;

  ctx.fillStyle = highlight
    ? "rgba(124, 140, 255, 0.25)"
    : "rgba(15, 18, 32, 0.75)";
  ctx.strokeStyle = highlight
    ? "rgba(124, 140, 255, 0.45)"
    : "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1 / globalScale;

  ctx.beginPath();
  ctx.roundRect(rx, ry, w, h, r);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = highlight ? "#f8fafc" : "#cbd5e1";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

export function paintNode(
  node: PaintNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  selectedId: string | null,
  hoveredId: string | null,
  tick: number,
) {
  const theme = NODE_THEME[resolveNodeType(node.type)];
  const isFact = node.type.startsWith("fact:");
  const r = effectiveRadius(node, selectedId);
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const isHover = node.id === hoveredId;
  const isSel = node.id === selectedId;
  const pulse = isSel ? 1 + Math.sin(tick * 0.08) * 0.08 : 1;

  ctx.save();

  if (isSel) {
    const ringR = (r + 10 / globalScale) * pulse;
    ctx.beginPath();
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `${theme.color}55`;
    ctx.lineWidth = 1.5 / globalScale;
    ctx.setLineDash([4 / globalScale, 4 / globalScale]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const glowR = r + (isSel ? 14 : isHover ? 10 : 6) / globalScale;
  const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR);
  glow.addColorStop(0, `${theme.color}55`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();

  if (isFact) {
    ctx.setLineDash([3 / globalScale, 2 / globalScale]);
  }

  const shellGrad = ctx.createRadialGradient(
    x,
    y - r * 0.4,
    r * 0.1,
    x,
    y,
    r,
  );
  shellGrad.addColorStop(0, "rgba(255,255,255,0.95)");
  shellGrad.addColorStop(0.45, theme.glow);
  shellGrad.addColorStop(1, theme.color);

  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = isSel ? 22 : isHover ? 16 : 8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = shellGrad;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(8, 12, 28, 0.82)";
  ctx.fill();

  ctx.strokeStyle = theme.glow;
  ctx.lineWidth = (isSel ? 2.5 : 1.5) / globalScale;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const iconSize = Math.max(11 / globalScale, 3.5);
  ctx.font = `600 ${iconSize}px var(--font-mind), system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.glow;
  ctx.fillText(theme.icon, x, y);

  const maxChars = isFact ? 18 : 16;
  const label =
    node.label.length > maxChars
      ? `${node.label.slice(0, maxChars)}…`
      : node.label;
  drawLabelPill(
    ctx,
    label,
    x,
    y + r + 12 / globalScale,
    globalScale,
    isSel || isHover,
  );

  ctx.restore();
}
