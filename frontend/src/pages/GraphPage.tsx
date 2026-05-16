import { NetworkGraph } from "../components/NetworkGraph";

export function GraphPage() {
  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h2 className="page-title">Graph view</h2>
          <p className="page-sub muted">Risk Scoring & Profiling Agent · suspicious paths and concentration (demo SVG)</p>
        </div>
      </div>
      <section className="panel elevate">
        <div className="panel-head">
          <h3>Network graph</h3>
          <span className="pill ghost">Accounts & flows</span>
        </div>
        <NetworkGraph variant="explorer" />
      </section>
    </div>
  );
}
