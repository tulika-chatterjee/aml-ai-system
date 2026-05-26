import { NetworkGraph } from "../components/NetworkGraph";

export function GraphPage() {
  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h2 className="page-title">Graph view</h2>
          <p className="page-sub muted">
            Risk Scoring & Profiling Agent · per-alert subgraph from uploaded transactions (open a case for live layout)
          </p>
        </div>
      </div>
      <section className="panel elevate">
        <div className="panel-head">
          <h3>Network graph</h3>
          <span className="pill ghost">Accounts & flows</span>
        </div>
        <NetworkGraph variant="explorer" />
        <p className="muted small" style={{ marginTop: 12 }}>
          For an account-specific diagram, open <strong>Cases</strong> from an alert — each investigation uses that alert&apos;s{" "}
          <code>graph_signals</code> (cluster size, large-value edges, real account IDs).
        </p>
      </section>
    </div>
  );
}
