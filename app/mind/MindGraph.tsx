"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ForceGraphMethods } from "react-force-graph-2d";
import {
  computeDegrees,
  effectiveRadius,
  paintFrameBackground,
  paintLink,
  paintNode,
  type PaintLink,
  type PaintNode,
} from "@/app/mind/canvas-paint";
import {
  configureGraphForces,
  graphCollisionVal,
  spreadInitialPositions,
} from "@/app/mind/graph-layout";
import { NODE_THEME, resolveNodeType } from "@/app/mind/graph-theme";
import styles from "@/app/mind/mind.module.css";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

type GraphNode = PaintNode;
type GraphLink = PaintLink;

interface MindGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  updatedAt?: string;
  counts?: { entities: number; facts: number; relations: number };
}

export function MindGraph({ error }: { error?: string | null }) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const tickRef = useRef(0);
  const [data, setData] = useState<MindGraphData>({ nodes: [], links: [] });
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [facts, setFacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [graphKey, setGraphKey] = useState(0);
  const [search, setSearch] = useState("");
  const [, setAnimTick] = useState(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      tickRef.current += 1;
      setAnimTick((t) => (t + 1) % 10000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mind/graph");
      if (res.status === 401) {
        setUnauthorized(true);
        return;
      }
      const json = (await res.json()) as MindGraphData;
      setData({
        nodes: [...json.nodes],
        links: [...json.links],
      });
      setGraphKey((k) => k + 1);
      setUnauthorized(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGraph();
    const id = setInterval(() => void loadGraph(), 10_000);
    return () => clearInterval(id);
  }, [loadGraph]);

  const filteredGraph = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;

    const matchIds = new Set(
      data.nodes
        .filter((n) => n.label.toLowerCase().includes(q))
        .map((n) => n.id),
    );

    for (const l of data.links) {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      if (matchIds.has(s) || matchIds.has(t)) {
        matchIds.add(s);
        matchIds.add(t);
      }
    }

    return {
      ...data,
      nodes: data.nodes.filter((n) => matchIds.has(n.id)),
      links: data.links.filter((l) => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        return matchIds.has(s) && matchIds.has(t);
      }),
    };
  }, [data, search]);

  const renderGraph = useMemo(() => {
    const degrees = computeDegrees(filteredGraph.nodes, filteredGraph.links);
    const nodes = spreadInitialPositions(
      filteredGraph.nodes.map((n) => ({
        ...n,
        degree: degrees.get(n.id) ?? 0,
      })),
    );
    return {
      nodes,
      links: filteredGraph.links,
    };
  }, [filteredGraph]);

  useEffect(() => {
    if (!renderGraph.nodes.length) return;
    const t = setTimeout(() => {
      fgRef.current?.zoomToFit(800, 72);
    }, 1400);
    return () => clearTimeout(t);
  }, [graphKey, renderGraph.nodes.length]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !renderGraph.nodes.length) return;
    configureGraphForces(fg, renderGraph.nodes.length);
    fg.d3ReheatSimulation();
  }, [graphKey, renderGraph.nodes.length]);

  const onNodeClick = useCallback(async (node: GraphNode) => {
    setSelected(node);
    const res = await fetch(
      `/api/mind/graph?nodeId=${encodeURIComponent(node.id)}`,
    );
    if (res.ok) {
      const json = (await res.json()) as { facts: string[] };
      setFacts(json.facts ?? []);
    }
  }, []);

  const selectedTheme = selected
    ? NODE_THEME[resolveNodeType(selected.type)]
    : null;

  const selectedId = selected?.id ?? null;
  const hoveredId = hovered?.id ?? null;

  if (error === "missing_token" || error === "invalid_token") {
    return (
      <div className={styles.center}>
        <div className={styles.centerCard}>
          <p>
            Link inválido o expirado. Pedí uno nuevo con <b>/mind</b> en Telegram.
          </p>
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className={styles.center}>
        <div className={styles.centerCard}>
          <p>
            Sesión expirada. En Telegram escribí <b>/mind</b> para abrir tu cerebro.
          </p>
        </div>
      </div>
    );
  }

  const counts = data.counts;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo} aria-hidden>
            🧠
          </div>
          <div className={styles.titleBlock}>
            <h1>Tu cerebro</h1>
            <p>Memoria viva · Animus</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          {counts ? (
            <span className={styles.statPill}>
              {counts.entities} ent · {counts.facts} hechos · {counts.relations}{" "}
              rel
            </span>
          ) : null}
          {data.updatedAt ? (
            <span className={styles.statPill}>
              {new Date(data.updatedAt).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ) : null}
          <button
            type="button"
            className={styles.btn}
            onClick={() => void loadGraph()}
          >
            Refrescar
          </button>
        </div>
      </header>

      <div className={styles.main}>
        <aside className={styles.legend}>
          <div className={styles.legendTitle}>Tipos</div>
          {(Object.keys(NODE_THEME) as Array<keyof typeof NODE_THEME>).map(
            (key) => (
              <div key={key} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ color: NODE_THEME[key].color }}
                />
                {NODE_THEME[key].label}
              </div>
            ),
          )}
          <div className={styles.searchWrap}>
            <div className={styles.legendTitle}>Buscar</div>
            <input
              type="search"
              className={styles.search}
              placeholder="Nombre o hecho…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </aside>

        <div className={styles.graphArea}>
          {loading && data.nodes.length === 0 ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>Armando tu grafo…</span>
            </div>
          ) : renderGraph.nodes.length === 0 ? (
            <div className={styles.hint}>
              <p>
                {search
                  ? "Ningún nodo coincide con la búsqueda."
                  : "Todavía no hay nodos en tu cerebro."}
              </p>
              {!search && (
                <p style={{ fontSize: "0.85rem" }}>
                  Charlá en Telegram, esperá unos segundos y tocá Refrescar.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className={styles.graphCanvas}>
                <ForceGraph2D
                  ref={fgRef}
                  key={graphKey}
                  graphData={renderGraph}
                  nodeId="id"
                  linkSource="source"
                  linkTarget="target"
                  backgroundColor="transparent"
                  linkWidth={0}
                  linkCanvasObjectMode={() => "replace"}
                  linkCanvasObject={(link, ctx, globalScale) =>
                    paintLink(
                      link as GraphLink,
                      ctx,
                      globalScale,
                      selectedId,
                      hoveredId,
                    )
                  }
                  linkDirectionalParticles={
                    selectedId ? 3 : 0
                  }
                  linkDirectionalParticleWidth={2}
                  linkDirectionalParticleSpeed={0.006}
                  nodeRelSize={1}
                  nodeVal={(n) => graphCollisionVal(n as GraphNode)}
                  nodeCanvasObjectMode={() => "replace"}
                  nodeCanvasObject={(n, ctx, globalScale) =>
                    paintNode(
                      n as GraphNode,
                      ctx,
                      globalScale,
                      selectedId,
                      hoveredId,
                      tickRef.current,
                    )
                  }
                  nodePointerAreaPaint={(n, color, ctx) => {
                    const node = n as GraphNode;
                    const r = effectiveRadius(node, null) + 6;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
                    ctx.fill();
                  }}
                  onRenderFramePre={(ctx, globalScale) => {
                    const c = ctx.canvas;
                    paintFrameBackground(ctx, c.width, c.height);
                  }}
                  d3AlphaDecay={0.012}
                  d3VelocityDecay={0.25}
                  warmupTicks={200}
                  cooldownTicks={250}
                  onEngineStop={() => {
                    fgRef.current?.zoomToFit(400, 72);
                  }}
                  onNodeClick={(n) => void onNodeClick(n as GraphNode)}
                  onNodeHover={(n) => setHovered((n as GraphNode) ?? null)}
                  onBackgroundClick={() => setSelected(null)}
                />
              </div>
              <div className={styles.zoomControls}>
                <button
                  type="button"
                  className={styles.zoomBtn}
                  title="Acercar"
                  onClick={() => {
                    const z = fgRef.current?.zoom() ?? 1;
                    fgRef.current?.zoom(z * 1.35, 300);
                  }}
                >
                  +
                </button>
                <button
                  type="button"
                  className={styles.zoomBtn}
                  title="Alejar"
                  onClick={() => {
                    const z = fgRef.current?.zoom() ?? 1;
                    fgRef.current?.zoom(z / 1.35, 300);
                  }}
                >
                  −
                </button>
                <button
                  type="button"
                  className={styles.zoomBtn}
                  title="Centrar"
                  onClick={() => fgRef.current?.zoomToFit(500, 72)}
                >
                  ◎
                </button>
                <button
                  type="button"
                  className={styles.zoomBtn}
                  title="Separar nodos"
                  onClick={() => {
                    const fg = fgRef.current;
                    if (!fg) return;
                    configureGraphForces(fg, renderGraph.nodes.length);
                    fg.d3ReheatSimulation();
                  }}
                >
                  ⤢
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {selected && selectedTheme && (
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>{selected.label}</h2>
            <div className={styles.panelMeta}>
              <span
                className={styles.typeBadge}
                style={{
                  background: `${selectedTheme.color}33`,
                  color: selectedTheme.glow,
                  border: `1px solid ${selectedTheme.color}55`,
                }}
              >
                {selectedTheme.label}
              </span>
              {(selected.factCount ?? 0) > 0 && (
                <span className={styles.factCount}>
                  {selected.factCount} hechos
                </span>
              )}
            </div>
          </div>
          <div className={styles.panelBody}>
            {facts.length === 0 ? (
              <p className={styles.factCount}>Sin detalle adicional.</p>
            ) : (
              <ul className={styles.factList}>
                {facts.map((f, i) => (
                  <li key={i} className={styles.factItem}>
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            className={styles.btnClose}
            onClick={() => {
              setSelected(null);
              setFacts([]);
            }}
          >
            Cerrar
          </button>
        </aside>
      )}
    </div>
  );
}
