type RiskCounts = {
  low: number;
  medium: number;
  high: number;
};

export function RiskDistributionChart({ counts }: { counts: RiskCounts }) {
  const total = counts.low + counts.medium + counts.high;
  const lowPct = total ? Math.round((counts.low / total) * 100) : 0;
  const medPct = total ? Math.round((counts.medium / total) * 100) : 0;
  const highPct = total ? Math.round((counts.high / total) * 100) : 0;

  return (
    <div className="risk-dist">
      <div className="risk-dist-track" role="img" aria-label="Risk distribution low medium high">
        <div className="risk-dist-segment low" style={{ width: `${lowPct}%` }} />
        <div className="risk-dist-segment medium" style={{ width: `${medPct}%` }} />
        <div className="risk-dist-segment high" style={{ width: `${highPct}%` }} />
      </div>

      <ul className="risk-dist-legend">
        <li>
          <span className="risk-swatch low" />
          <span className="risk-name">Low risk</span>
          <span className="risk-val">
            {counts.low} <span className="muted">({lowPct}%)</span>
          </span>
        </li>
        <li>
          <span className="risk-swatch medium" />
          <span className="risk-name">Medium risk</span>
          <span className="risk-val">
            {counts.medium} <span className="muted">({medPct}%)</span>
          </span>
        </li>
        <li>
          <span className="risk-swatch high" />
          <span className="risk-name">High risk</span>
          <span className="risk-val">
            {counts.high} <span className="muted">({highPct}%)</span>
          </span>
        </li>
      </ul>
    </div>
  );
}
