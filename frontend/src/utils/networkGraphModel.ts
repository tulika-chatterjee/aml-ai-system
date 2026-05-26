/** Build a render model from backend `graph_signals` (NetworkX cluster + sample edges). */

export type GraphEdge = {
  from: string;
  to: string;
  amount?: number;
  flag_large?: boolean;
};

export type GraphNodeRole = "subject" | "hub" | "high_value_sink" | "peer";

export type LayoutNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  role: GraphNodeRole;
};

export type LayoutEdge = {
  from: string;
  to: string;
  amount: number;
  flagged: boolean;
};

export type NetworkGraphModel = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  clusterSize: number;
  suspiciousEdgeRatio: number;
  source: string;
  caption: string;
  legend: string;
};

const W = 520;
const H = 260;
const PAD = 48;

function shortLabel(id: string): string {
  const tail = id.match(/(\d{2,})$/);
  if (tail) return `…${tail[1]}`;
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…`;
}

function parseEdges(raw: unknown): GraphEdge[] {
  if (!Array.isArray(raw)) return [];
  const out: GraphEdge[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    const from = String(o.from ?? "");
    const to = String(o.to ?? "");
    if (!from || !to) continue;
    out.push({
      from,
      to,
      amount: typeof o.amount === "number" ? o.amount : undefined,
      flag_large: Boolean(o.flag_large),
    });
  }
  return out;
}

function nodeRoles(
  nodeIds: string[],
  edges: GraphEdge[],
  focusAccountId: string | undefined,
): Map<string, GraphNodeRole> {
  const roles = new Map<string, GraphNodeRole>();
  for (const id of nodeIds) roles.set(id, "peer");

  const subject =
    focusAccountId && nodeIds.includes(focusAccountId)
      ? focusAccountId
      : nodeIds[0];
  if (subject) roles.set(subject, "subject");

  const degree = new Map<string, number>();
  const outLarge = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
    if (e.flag_large || (e.amount ?? 0) >= 9000) {
      outLarge.set(e.to, (outLarge.get(e.to) ?? 0) + 1);
    }
  }

  let hub = subject;
  let hubDeg = -1;
  for (const id of nodeIds) {
    const d = degree.get(id) ?? 0;
    if (d > hubDeg) {
      hubDeg = d;
      hub = id;
    }
  }
  if (hub && hub !== subject) roles.set(hub, "hub");

  let sink = "";
  let sinkScore = -1;
  for (const id of nodeIds) {
    if (id === subject) continue;
    const score = (outLarge.get(id) ?? 0) * 10 + (degree.get(id) ?? 0);
    if (score > sinkScore) {
      sinkScore = score;
      sink = id;
    }
  }
  if (sink && sink !== subject && sink !== hub) roles.set(sink, "high_value_sink");

  return roles;
}

/** Layered layout from subject following outbound edges (falls back to undirected BFS). */
function layoutNodes(
  nodeIds: string[],
  edges: GraphEdge[],
  roles: Map<string, GraphNodeRole>,
): LayoutNode[] {
  const subject = [...roles.entries()].find(([, r]) => r === "subject")?.[0] ?? nodeIds[0];
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    adj.get(e.from)!.add(e.to);
    if (!adj.has(e.to)) adj.set(e.to, new Set());
    adj.get(e.to)!.add(e.from);
  }

  const layer = new Map<string, number>();
  const queue = [subject];
  layer.set(subject, 0);
  while (queue.length) {
    const cur = queue.shift()!;
    const d = layer.get(cur)!;
    for (const nxt of adj.get(cur) ?? []) {
      if (!layer.has(nxt)) {
        layer.set(nxt, d + 1);
        queue.push(nxt);
      }
    }
  }
  for (const id of nodeIds) {
    if (!layer.has(id)) layer.set(id, (layer.get(subject) ?? 0) + 1);
  }

  const byLayer = new Map<number, string[]>();
  for (const id of nodeIds) {
    const L = layer.get(id) ?? 0;
    if (!byLayer.has(L)) byLayer.set(L, []);
    byLayer.get(L)!.push(id);
  }

  const maxLayer = Math.max(...byLayer.keys(), 0);
  const positions = new Map<string, { x: number; y: number }>();

  for (const [L, ids] of byLayer) {
    const x = PAD + (L / Math.max(maxLayer, 1)) * (W - 2 * PAD);
    ids.forEach((id, i) => {
      const y = PAD + ((i + 1) / (ids.length + 1)) * (H - 2 * PAD);
      positions.set(id, { x, y });
    });
  }

  return nodeIds.map((id) => {
    const pos = positions.get(id) ?? { x: W / 2, y: H / 2 };
    return {
      id,
      label: shortLabel(id),
      x: pos.x,
      y: pos.y,
      role: roles.get(id) ?? "peer",
    };
  });
}

export function buildNetworkGraphModel(
  graphSignals: Record<string, unknown> | null | undefined,
  focusAccountId?: string,
): NetworkGraphModel | null {
  const edges = parseEdges(graphSignals?.sample_edges);
  if (!edges.length && !focusAccountId) return null;

  const nodeSet = new Set<string>();
  if (focusAccountId) nodeSet.add(focusAccountId);
  for (const e of edges) {
    nodeSet.add(e.from);
    nodeSet.add(e.to);
  }
  const nodeIds = [...nodeSet];
  if (!nodeIds.length) return null;

  const roles = nodeRoles(nodeIds, edges, focusAccountId);
  const nodes = layoutNodes(nodeIds, edges, roles);
  const layoutEdges: LayoutEdge[] = edges.map((e) => ({
    from: e.from,
    to: e.to,
    amount: e.amount ?? 0,
    flagged: Boolean(e.flag_large || (e.amount ?? 0) >= 9000),
  }));

  const clusterSize =
    typeof graphSignals?.cluster_size === "number" ? graphSignals.cluster_size : nodeIds.length;
  const suspiciousEdgeRatio =
    typeof graphSignals?.suspicious_edge_ratio === "number" ? graphSignals.suspicious_edge_ratio : 0;
  const source = typeof graphSignals?.source === "string" ? graphSignals.source : "networkx";

  const subject = nodes.find((n) => n.role === "subject");
  const hub = nodes.find((n) => n.role === "hub");
  const sink = nodes.find((n) => n.role === "high_value_sink");

  const caption = subject
    ? `Subject ${subject.label} · cluster ${clusterSize} · large-tx ratio ${(suspiciousEdgeRatio * 100).toFixed(0)}%`
    : `Cluster ${clusterSize} accounts · large-tx ratio ${(suspiciousEdgeRatio * 100).toFixed(0)}%`;

  const legendParts = [
    subject ? `${subject.label} = alerted account` : null,
    hub && hub.id !== subject?.id ? `${hub.label} = hub (most connections)` : null,
    sink ? `${sink.label} = high-value sink` : null,
    `Source: ${source}`,
  ].filter(Boolean);

  return {
    nodes,
    edges: layoutEdges,
    clusterSize,
    suspiciousEdgeRatio,
    source,
    caption,
    legend: legendParts.join(" · "),
  };
}

export function roleClass(role: GraphNodeRole): string {
  switch (role) {
    case "subject":
      return " hot";
    case "hub":
      return " accent";
    case "high_value_sink":
      return " offshore";
    default:
      return "";
  }
}

export function roleTitle(role: GraphNodeRole): string {
  switch (role) {
    case "subject":
      return "Alerted account";
    case "hub":
      return "Concentration hub";
    case "high_value_sink":
      return "High-value / flagged inbound";
    default:
      return "Linked account";
  }
}
