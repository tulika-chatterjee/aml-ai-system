import type { AlertSummary } from "../api";

type Props = {
  alerts: AlertSummary[];
};

export function CompliancePage({ alerts }: Props) {
  const sarFiled = alerts.filter((a) => {
    const s = a.status.toLowerCase();
    return s.includes("sar") || s.includes("smr") || s.includes("filed");
  }).length;
  const highRisk = alerts.filter((a) => a.severity.toLowerCase() === "high" || a.hybrid_score >= 0.85).length;

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h2 className="page-title">Compliance</h2>
          <p className="page-sub muted">AUSTRAC-aligned oversight view for SAR pipeline and alert governance</p>
        </div>
      </div>

      <section className="kpi-grid">
        <div className="kpi-card green">
          <p className="kpi-label">SARs filed</p>
          <p className="kpi-value">{sarFiled}</p>
        </div>
        <div className="kpi-card red">
          <p className="kpi-label">High-risk alerts</p>
          <p className="kpi-value">{highRisk}</p>
        </div>
        <div className="kpi-card blue">
          <p className="kpi-label">Total alerts reviewed</p>
          <p className="kpi-value">{alerts.length}</p>
        </div>
      </section>

      <section className="panel elevate">
        <div className="panel-head">
          <h3>Compliance checklist (demo)</h3>
        </div>
        <ul className="rule-list">
          <li>Customer due diligence controls in place</li>
          <li>Ongoing monitoring and risk-based thresholds active</li>
          <li>SAR/SMR decision trail retained for auditability</li>
          <li>Human-in-the-loop review captured with analyst feedback</li>
        </ul>
      </section>
    </div>
  );
}
