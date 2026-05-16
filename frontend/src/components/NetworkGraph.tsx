/** Lightweight SVG graph — demo “wow” surface until a graph library is added. */
export function NetworkGraph({ variant }: { variant?: "case" | "explorer" }) {
  const emphasis = variant === "case";
  return (
    <div className="graph-panel">
      <svg viewBox="0 0 520 260" className="graph-svg" role="img" aria-label="Account transaction network">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#475569" />
          </marker>
        </defs>
        <line x1="70" y1="130" x2="170" y2="90" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1="170" y1="90" x2="280" y2="130" stroke={emphasis ? "#f472b6" : "#334155"} strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1="170" y1="90" x2="210" y2="200" stroke={emphasis ? "#38bdf8" : "#334155"} strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1="280" y1="130" x2="400" y2="160" stroke={emphasis ? "#f472b6" : "#334155"} strokeWidth="2.5" markerEnd="url(#arrow)" />
        <text x="260" y="24" className="graph-caption">
          {emphasis ? "Highlighted path: layering toward offshore node" : "Nodes = accounts · edges = flows"}
        </text>

        <circle cx="70" cy="130" r="28" className="graph-node" />
        <text x="70" y="136" textAnchor="middle" className="graph-label">
          A
        </text>

        <circle cx="170" cy="90" r="30" className={`graph-node${emphasis ? " hot" : ""}`} />
        <text x="170" y="96" textAnchor="middle" className="graph-label">
          B
        </text>

        <circle cx="280" cy="130" r="28" className="graph-node" />
        <text x="280" y="136" textAnchor="middle" className="graph-label">
          C
        </text>

        <circle cx="210" cy="200" r="26" className={`graph-node${emphasis ? " accent" : ""}`} />
        <text x="210" y="206" textAnchor="middle" className="graph-label">
          Hub
        </text>

        <circle cx="400" cy="160" r="34" className={`graph-node offshore${emphasis ? " pulse" : ""}`} />
        <text x="400" y="166" textAnchor="middle" className="graph-label">
          Offshore
        </text>
      </svg>
      <p className="graph-legend muted">
        A → B → C → Offshore · Hub receives consolidated flows (demo layout).
      </p>
    </div>
  );
}
