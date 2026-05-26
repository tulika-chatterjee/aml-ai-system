import {
  buildNetworkGraphModel,
  roleClass,
  roleTitle,
  type NetworkGraphModel,
} from "../utils/networkGraphModel";

type Props = {
  variant?: "case" | "explorer";
  /** Per-alert payload from detection (`graph_signals`). */
  graphSignals?: Record<string, unknown> | null;
  /** Account under investigation — highlighted as subject node. */
  focusAccountId?: string;
};

function edgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  r = 26,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: from.x + ux * r,
    y1: from.y + uy * r,
    x2: to.x - ux * r,
    y2: to.y - uy * r,
  };
}

function LiveGraph({ model, emphasis }: { model: NetworkGraphModel; emphasis: boolean }) {
  const pos = new Map(model.nodes.map((n) => [n.id, n]));

  return (
    <div className="graph-panel">
      <svg viewBox="0 0 520 260" className="graph-svg" role="img" aria-label="Account transaction network from alert data">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#475569" />
          </marker>
        </defs>
        <text x="260" y="22" textAnchor="middle" className="graph-caption">
          {model.caption}
        </text>

        {model.edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const { x1, y1, x2, y2 } = edgePath(a, b);
          const hot = emphasis && e.flagged;
          return (
            <line
              key={`${e.from}-${e.to}-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={hot ? "#f472b6" : "#334155"}
              strokeWidth={hot ? 2.5 : 1.75}
              markerEnd="url(#arrow)"
            />
          );
        })}

        {model.nodes.map((n) => (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r={n.role === "subject" || n.role === "high_value_sink" ? 30 : 26}
              className={`graph-node${roleClass(n.role)}${emphasis && n.role === "high_value_sink" ? " pulse" : ""}`}
            >
              <title>{`${n.id} — ${roleTitle(n.role)}`}</title>
            </circle>
            <text x={n.x} y={n.y + 5} textAnchor="middle" className="graph-label">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      <p className="graph-legend muted">{model.legend}</p>
    </div>
  );
}

export function NetworkGraph({ variant, graphSignals, focusAccountId }: Props) {
  const emphasis = variant === "case";
  const model = buildNetworkGraphModel(graphSignals, focusAccountId);

  if (!model) {
    return (
      <div className="graph-panel graph-empty">
        <p className="muted">
          {focusAccountId
            ? `No transaction links in the scoring window for ${focusAccountId}. Upload transactions and run detection.`
            : "Open a case from Alerts to see the account-specific network built from real flows."}
        </p>
      </div>
    );
  }

  return <LiveGraph model={model} emphasis={emphasis} />;
}
