import { AGENT_PIPELINE } from "../agents/catalog";

/** Compact vertical reference in the shell sidebar (hover for full role text). */
export function AgentPipelineRail() {
  return (
    <div className="agent-rail">
      <p className="agent-rail-title">Multi-agent pipeline</p>
      <ol className="agent-rail-list">
        {AGENT_PIPELINE.map((a, i) => (
          <li key={a.id} className="agent-rail-item" title={`${a.title}: ${a.description}`}>
            <span className="agent-rail-step" aria-hidden>
              {i + 1}
            </span>
            <span className="agent-rail-name">{a.shortLabel}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Full-width agent cards (used on the Pipeline tab). */
export function AgentPipelineOverview() {
  return (
    <section className="panel elevate agent-overview-panel" aria-labelledby="agent-overview-heading">
      <div className="panel-head">
        <h3 id="agent-overview-heading">Agent stages</h3>
        <span className="pill ghost">{AGENT_PIPELINE.length} agents</span>
      </div>
      <div className="agent-card-grid">
        {AGENT_PIPELINE.map((a, i) => (
          <article key={a.id} className="agent-card">
            <span className="agent-card-index">{i + 1}</span>
            <h4 className="agent-card-title">{a.title}</h4>
            <p className="agent-card-desc">{a.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
