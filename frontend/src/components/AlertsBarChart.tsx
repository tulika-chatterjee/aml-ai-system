type Point = { label: string; count: number };

export function AlertsBarChart({ series }: { series: Point[] }) {
  const max = Math.max(1, ...series.map((p) => p.count));
  const w = 520;
  const h = 140;
  const pad = 28;
  const barW = (w - pad * 2) / series.length - 6;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label="Alerts over time">
        {series.map((p, i) => {
          const bh = ((h - pad - 8) * p.count) / max;
          const x = pad + i * ((w - pad * 2) / series.length) + 4;
          const y = h - pad - bh;
          return (
            <g key={p.label}>
              <rect x={x} y={y} width={barW} height={bh} rx={4} className="chart-bar" />
              <text x={x + barW / 2} y={h - 6} textAnchor="middle" className="chart-axis">
                {p.label.slice(5)}
              </text>
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" className="chart-value">
                {p.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
