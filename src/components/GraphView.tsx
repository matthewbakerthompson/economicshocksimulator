import { useEffect, useMemo, useRef } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import { EDGES, NODES } from "../sim/graphSpec";
import type { NodeId } from "../sim/types";
import { useAppStore } from "../state/store";
import { rgbaFromHex, stressToColor } from "../ui/colors";
import { drawWaveOverlay } from "../ui/waveOverlay";

type EdgeAttrs = { weight: number; lag: number; from: NodeId; to: NodeId; label: string };

export function GraphView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  const t = useAppStore((s) => s.t);
  const tFloat = useAppStore((s) => s.tFloat);
  const result = useAppStore((s) => s.result);
  const scenario = useAppStore((s) => s.scenario);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const hoverNodeId = useAppStore((s) => s.hoverNodeId);
  const setSelectedNodeId = useAppStore((s) => s.setSelectedNodeId);
  const setHoverNodeId = useAppStore((s) => s.setHoverNodeId);

  const tFloatRef = useRef(0);
  const resultRef = useRef<typeof result>(null);
  const selectedRef = useRef<NodeId | null>(null);
  const hoverRef = useRef<NodeId | null>(null);

  useEffect(() => {
    tFloatRef.current = tFloat;
  }, [tFloat]);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);
  useEffect(() => {
    selectedRef.current = selectedNodeId;
  }, [selectedNodeId]);
  useEffect(() => {
    hoverRef.current = hoverNodeId;
  }, [hoverNodeId]);

  const graph = useMemo(() => {
    const g = new Graph();
    for (const n of NODES) {
      g.addNode(n.id, {
        x: n.x,
        y: n.y,
        size: 9,
        color: "#6fe9ff",
        label: n.label,
        layer: n.layer,
        description: n.description,
      });
    }
    for (const e of EDGES) {
      g.addEdge(e.from, e.to, {
        weight: e.weight,
        lag: e.typicalLag,
        from: e.from,
        to: e.to,
        label: e.label,
        size: 1.2,
        color: "rgba(120,220,255,0.12)",
      } satisfies EdgeAttrs & Record<string, unknown>);
    }
    return g;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (sigmaRef.current) return;

    const renderer = new Sigma(graph, container, {
      renderEdgeLabels: false,
      allowInvalidContainer: false,
      labelFont: "ui-sans-serif, system-ui, Segoe UI, Roboto, Arial",
      labelSize: 14,
      labelWeight: "600",
      labelRenderedSizeThreshold: 14,
      defaultNodeColor: "#6fe9ff",
      defaultEdgeColor: "rgba(120,220,255,0.10)",
      zIndex: true,
    });

    renderer.on("clickNode", ({ node }) => setSelectedNodeId(node as NodeId));
    renderer.on("enterNode", ({ node }) => setHoverNodeId(node as NodeId));
    renderer.on("leaveNode", () => setHoverNodeId(null));

    sigmaRef.current = renderer;
    return () => {
      renderer.kill();
      sigmaRef.current = null;
    };
  }, [graph, setHoverNodeId, setSelectedNodeId]);

  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;

    const seriesAt = (id: NodeId, at: number) => {
      const r = resultRef.current;
      const series = r?.seriesByNode[id];
      if (!series) return 0;
      const maxIdx = Math.max(0, series.length - 1);
      const clamped = Math.max(0, Math.min(maxIdx, at));
      const i0 = Math.floor(clamped);
      const i1 = Math.min(maxIdx, i0 + 1);
      const f = clamped - i0;
      return series[i0] * (1 - f) + series[i1] * f;
    };

    sigma.setSetting("nodeReducer", (node, data) => {
      const id = node as NodeId;
      const s = seriesAt(id, tFloatRef.current);
      const isSelected = id === selectedRef.current;
      const isHover = id === hoverRef.current;

      const base = { ...data };
      // Smaller core + translucent color so the overlay "plasma" reads as the main shape.
      const size = 6.5 + s * 12 + (isSelected ? 4 : 0) + (isHover ? 2 : 0);
      const colorHex = stressToColor(s);
      const alpha = isSelected || isHover ? 0.92 : 0.55 + s * 0.25;
      const color = rgbaFromHex(colorHex, alpha);

      // Show labels only on hover/selection to keep it clean.
      base.label = isSelected || isHover ? (data.label as string) : "";
      base.size = size;
      base.color = color;

      // Slight layer separation in depth ordering.
      base.zIndex = (data.layer === "Markets" ? 3 : data.layer === "Credit" ? 2 : 1) + (isSelected ? 10 : 0);
      return base;
    });

    sigma.setSetting("edgeReducer", (edge, data) => {
      const attrs = data as unknown as EdgeAttrs & Record<string, unknown>;
      const from = attrs.from as NodeId;
      const lag = typeof attrs.lag === "number" ? attrs.lag : 1;
      const w = typeof attrs.weight === "number" ? attrs.weight : 0.2;

      const srcT = Math.max(0, tFloatRef.current - lag);
      const src = seriesAt(from, srcT);
      const activation = Math.max(0, Math.min(1, src * w * 2.5));

      const base = { ...data };
      // Keep Sigma edges understated; overlay provides the “main” energy beams.
      const alpha = 0.03 + activation * 0.18;
      const edgeColor = stressToColor(Math.min(1, src * 0.9));
      base.color = rgbaFromHex(edgeColor, alpha);
      base.size = 0.55 + activation * 1.2;
      return base;
    });

    sigma.refresh();
  }, [graph]);

  useEffect(() => {
    const canvas = overlayRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const sigma = sigmaRef.current;
    const canvas = overlayRef.current;
    if (!sigma || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const edges = EDGES.map((e) => ({
      from: e.from,
      to: e.to,
      weight: e.weight,
      lag: e.typicalLag,
    }));

    const unemploymentWindows = scenario.events
      .filter((e) => e.type === "unemployment")
      .map((e) => ({ startStep: e.startStep, durationSteps: e.durationSteps, magnitude: e.magnitude }));

    const tick = () => {
      phaseRef.current += 0.016; // ~60fps phase increment

      if (result) {
        // Smoothly refresh Sigma styling (node alpha/size) in sync with overlay.
        sigma.refresh();
        drawWaveOverlay({
          ctx,
          sigma,
          graph,
          edges,
          state: {
            tFloat: tFloatRef.current,
            phase: phaseRef.current,
            seriesByNode: result.seriesByNode,
            unemploymentWindows,
          },
        });
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [graph, result, scenario.events]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <canvas
        ref={overlayRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          mixBlendMode: "screen",
          opacity: 0.95,
        }}
      />
    </div>
  );
}


