import type { ForceGraphMethods } from "react-force-graph-2d";
import { effectiveRadius } from "@/app/mind/canvas-paint";

type LayoutNode = {
  id: string;
  x?: number;
  y?: number;
  factCount?: number;
  degree?: number;
};

/** Posiciones iniciales en anillo para que no arranquen todos en el centro. */
export function spreadInitialPositions<T extends LayoutNode>(nodes: T[]): T[] {
  const count = nodes.length;
  if (count === 0) return nodes;

  const baseRadius = 140 + Math.sqrt(count) * 55;

  return nodes.map((n, i) => {
    if (n.x != null && n.y != null) return n;
    const angle = (i / count) * Math.PI * 2 + (i % 5) * 0.35;
    const ring = i % 2 === 0 ? 1 : 1.45;
    const jitter = ((i * 23) % 50) - 25;
    const r = baseRadius * ring + jitter;
    return {
      ...n,
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    };
  });
}

export function configureGraphForces(
  fg: ForceGraphMethods,
  nodeCount: number,
): void {
  const chargeStrength = -280 - Math.min(nodeCount * 15, 320);
  const linkDistance = 110 + Math.min(nodeCount * 10, 160);

  type D3Force = { strength?: (v: number) => void; distance?: (v: number) => void };

  const charge = fg.d3Force("charge") as D3Force | undefined;
  charge?.strength?.(chargeStrength);

  const link = fg.d3Force("link") as D3Force | undefined;
  link?.distance?.(linkDistance);

  const center = fg.d3Force("center") as D3Force | undefined;
  center?.strength?.(0.02);
}

/** Radio para colisión del motor (nodeVal) — incluye espacio para etiqueta. */
export function graphCollisionVal(n: LayoutNode): number {
  const r = effectiveRadius(
    {
      id: n.id,
      label: "",
      type: "other",
      factCount: n.factCount,
      degree: n.degree,
    },
    null,
  );
  return ((r + 32) / 4) ** 2;
}

export function graphRadiusForNode(n: LayoutNode): number {
  return effectiveRadius(
    {
      id: n.id,
      label: "",
      type: "other",
      factCount: n.factCount,
      degree: n.degree,
    },
    null,
  );
}
