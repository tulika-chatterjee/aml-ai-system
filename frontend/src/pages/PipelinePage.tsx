import { AgentPipelineOverview } from "../components/AgentPipeline";

export function PipelinePage() {
  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h2 className="page-title">Detection pipeline</h2>
          <p className="page-sub muted">
            Six-agent layout from ingestion through risk scoring and profiling, case management, SAR generation,
            compliance mapping, and analyst feedback.
          </p>
        </div>
      </div>
      <AgentPipelineOverview />
    </div>
  );
}
