type Point = { label: string; count: number };

const SLICE_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#64748b"];

export function AlertsPieChart({ series }: { series: Point[] }) {
  const total = series.reduce((s, p) => s + p.count, 0);
  const cx = 110;
  const cy = 110;
  const r = 92;

  if (total === 0) {
    return (
      <div className="chart-wrap">
        <p className="chart-empty muted" role="img" aria-label="Alerts distribution">
          No alerts in the last 7 days.
        </p>
      </div>
    );
  }

  const colorFor = (label: string) =>
    SLICE_COLORS[Math.max(0, series.findIndex((s) => s.label === label)) % SLICE_COLORS.length];

  let angle = -Math.PI / 2;
  const slices = series
    .filter((p) => p.count > 0)
    .map((p) => {
      const sweep = (p.count / total) * 2 * Math.PI;
      const a0 = angle;
      const a1 = angle + sweep;
      angle = a1;
      const x1 = cx + r * Math.cos(a0);
      const y1 = cy + r * Math.sin(a0);
      const x2 = cx + r * Math.cos(a1);
      const y2 = cy + r * Math.sin(a1);
      const largeArc = sweep > Math.PI ? 1 : 0;
      const d =
        sweep >= 2 * Math.PI - 1e-6
          ? `M ${cx} ${cy} m -${r}, 0 a ${r},${r} 0 1,1 ${2 * r},0 a ${r},${r} 0 1,1 -${2 * r},0`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      return { d, color: colorFor(p.label), ...p };
    });

  return (
    <div className="chart-wrap chart-split pie-layout">
      <svg viewBox="0 0 220 220" className="chart-svg chart-pie-svg" role="img" aria-label="Alerts share by day">
        {slices.map((s) => (
          <path key={s.label} d={s.d} fill={s.color} stroke="#0b0f17" strokeWidth="2" />
        ))}
      </svg>
      <ul className="pie-legend">
        {series.map((p, i) => {
          const pct = total ? Math.round((p.count / total) * 100) : 0;
          return (
            <li key={p.label}>
              <span className="pie-swatch" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} aria-hidden />
              <span className="pie-legend-day">{p.label.slice(5)}</span>
              <span className="pie-legend-val">
                {p.count} <span className="muted">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
