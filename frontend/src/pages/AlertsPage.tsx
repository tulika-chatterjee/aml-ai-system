import type { AlertSummary } from "../api";
import { displaySeverity, severityCssClass } from "../utils/severity";

type Props = {
  alerts: AlertSummary[];
  busy: boolean;
  onViewCase: (alertId: string) => void;
  /** rule flags need detail fetch — show rule_count until expanded */
  rulePreview: (a: AlertSummary) => string;
};

export function AlertsPage({ alerts, busy, onViewCase, rulePreview }: Props) {
  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h2 className="page-title">Alerts</h2>
          <p className="page-sub muted">
            Risk Scoring & Profiling Agent output · hybrid ML + rules + network context · open a case for full
            investigator workspace
          </p>
        </div>
      </div>

      <section className="panel elevate">
        <div className="panel-head">
          <h3>Alert queue</h3>
          <span className="pill">{alerts.length} items</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Risk score</th>
                <th>Flags</th>
                <th>Severity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.id.slice(0, 8)}…</td>
                  <td>{a.hybrid_score.toFixed(2)}</td>
                  <td className="flags-cell">{rulePreview(a)}</td>
                  <td>
                    <span className={`sev ${severityCssClass(a.severity)}`}>{displaySeverity(a.severity)}</span>
                  </td>
                  <td>
                    <button type="button" className="btn primary sm" disabled={busy} onClick={() => onViewCase(a.id)}>
                      View case
                    </button>
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No alerts yet. Ensure the API is running (auto-seeds alerts) or click Run detection cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
