import type { AlertSummary } from "../api";

type Props = {
  alerts: AlertSummary[];
  onViewCase: (alertId: string) => void;
};

export function SARsPage({ alerts, onViewCase }: Props) {
  const sars = alerts.filter((a) => {
    const status = a.status.toLowerCase();
    return status.includes("sar") || status.includes("smr") || status.includes("filed");
  });

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h2 className="page-title">SARs</h2>
          <p className="page-sub muted">Suspicious Activity Reports / Suspicious Matter Reports filed queue</p>
        </div>
      </div>

      <section className="panel elevate">
        <div className="panel-head">
          <h3>Filed SAR/SMR items</h3>
          <span className="pill">{sars.length} items</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Account</th>
                <th>Risk score</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sars.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.id.slice(0, 8)}…</td>
                  <td>{a.account_id}</td>
                  <td>{a.hybrid_score.toFixed(2)}</td>
                  <td>{a.status}</td>
                  <td>
                    <button type="button" className="btn link sm" onClick={() => onViewCase(a.id)}>
                      View case
                    </button>
                  </td>
                </tr>
              ))}
              {sars.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No SAR/SMR-filed items found yet. Items appear here when alert status is marked as filed.
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
