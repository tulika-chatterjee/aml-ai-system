type Point = { label: string; count: number };

export function AlertsBurnupChart({ series }: { series: Point[] }) {
  const cumulative = series.reduce<number[]>((acc, p, i) => {
    const prev = i === 0 ? 0 : acc[i - 1];
    acc.push(prev + p.count);
    return acc;
  }, []);

  const total = cumulative[cumulative.length - 1] ?? 0;
  const goal = Math.max(total, series.length * 2);
  const maxY = Math.max(1, goal);

  const w = 560;
  const h = 190;
  const padLeft = 38;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 30;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const stepX = series.length > 1 ? chartW / (series.length - 1) : 0;

  const pointXY = (v: number, i: number) => {
    const x = padLeft + i * stepX;
    const y = padTop + chartH - (v / maxY) * chartH;
    return { x, y };
  };

  const cumulativePath = cumulative
    .map((v, i) => {
      const p = pointXY(v, i);
      return `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`;
    })
    .join(" ");

  const goalPath = series
    .map((_, i) => {
      const v = (goal / Math.max(1, series.length - 1)) * i;
      const p = pointXY(v, i);
      return `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`;
    })
    .join(" ");

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label="Alerts burn-up chart">
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + chartH} className="burnup-axis" />
        <line x1={padLeft} y1={padTop + chartH} x2={w - padRight} y2={padTop + chartH} className="burnup-axis" />

        <line
          x1={padLeft}
          y1={pointXY(goal, 0).y}
          x2={w - padRight}
          y2={pointXY(goal, 0).y}
          className="burnup-gridline"
        />

        <path d={goalPath} className="burnup-goal-line" />
        <path d={cumulativePath} className="burnup-actual-line" />

        {series.map((p, i) => {
          const v = cumulative[i] ?? 0;
          const pt = pointXY(v, i);
          return (
            <g key={p.label}>
              <circle cx={pt.x} cy={pt.y} r={3.5} className="burnup-point" />
              <text x={pt.x} y={h - 8} textAnchor="middle" className="chart-axis">
                {p.label.slice(5)}
              </text>
            </g>
          );
        })}

        <text x={padLeft} y={12} className="burnup-legend-label">
          Cumulative alerts: {total}
        </text>
        <text x={w - padRight} y={12} textAnchor="end" className="burnup-legend-label muted">
          Reference trajectory: {goal}
        </text>
      </svg>
    </div>
  );
}
