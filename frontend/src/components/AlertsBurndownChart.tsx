import type { AlertSummary } from "../api";

type Point = { label: string; count: number };

type DaySeverity = { low: number; medium: number; high: number };

function severityBucket(a: AlertSummary): keyof DaySeverity {
  const sev = a.severity.toLowerCase();
  if (sev === "high" || a.hybrid_score >= 0.75) return "high";
  if (sev === "medium" || a.hybrid_score >= 0.5) return "medium";
  return "low";
}

function severityByDay(alerts: AlertSummary[], series: Point[]): DaySeverity[] {
  return series.map((p) => {
    const dayAlerts = alerts.filter((a) => a.created_at.slice(0, 10) === p.label);
    const buckets: DaySeverity = { low: 0, medium: 0, high: 0 };
    for (const a of dayAlerts) {
      buckets[severityBucket(a)] += 1;
    }
    return buckets;
  });
}

export function AlertsBurndownChart({
  series,
  alerts,
}: {
  series: Point[];
  alerts: AlertSummary[];
}) {
  const total = series.reduce((s, p) => s + p.count, 0);
  const distribution = severityByDay(alerts, series);

  /** Remaining backlog at the start of each day (burndown from period total). */
  const remaining = series.map((_, i) => {
    const cleared = series.slice(0, i).reduce((s, p) => s + p.count, 0);
    return Math.max(0, total - cleared);
  });

  const w = 560;
  const h = 210;
  const padLeft = 38;
  const padRight = 14;
  const padTop = 22;
  const padBottom = 36;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const maxY = Math.max(1, total);
  const stepX = series.length > 1 ? chartW / (series.length - 1) : 0;
  const stackH = 28;

  const pointXY = (v: number, i: number) => {
    const x = padLeft + i * stepX;
    const y = padTop + chartH - (v / maxY) * (chartH - stackH);
    return { x, y };
  };

  const burndownPath = remaining
    .map((v, i) => {
      const p = pointXY(v, i);
      return `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`;
    })
    .join(" ");

  const idealPath = series
    .map((_, i) => {
      const v = total - (total / Math.max(1, series.length - 1)) * i;
      const p = pointXY(v, i);
      return `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`;
    })
    .join(" ");

  const barW = series.length > 0 ? chartW / series.length - 8 : 0;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label="Alerts burndown and distribution">
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + chartH} className="burndown-axis" />
        <line x1={padLeft} y1={padTop + chartH} x2={w - padRight} y2={padTop + chartH} className="burndown-axis" />

        <line
          x1={padLeft}
          y1={pointXY(0, 0).y}
          x2={w - padRight}
          y2={pointXY(0, 0).y}
          className="burndown-gridline"
        />

        {series.map((p, i) => {
          const dist = distribution[i] ?? { low: 0, medium: 0, high: 0 };
          const dayTotal = dist.low + dist.medium + dist.high;
          const x = padLeft + i * stepX - barW / 2;
          const baseY = padTop + chartH;
          let y = baseY;
          const segments: { key: keyof DaySeverity; h: number; className: string }[] = [
            { key: "low", h: 0, className: "burndown-stack-low" },
            { key: "medium", h: 0, className: "burndown-stack-medium" },
            { key: "high", h: 0, className: "burndown-stack-high" },
          ];
          if (dayTotal > 0) {
            const scale = stackH;
            segments[0].h = (dist.low / dayTotal) * scale;
            segments[1].h = (dist.medium / dayTotal) * scale;
            segments[2].h = (dist.high / dayTotal) * scale;
          }

          return (
            <g key={p.label}>
              {segments.map((seg) => {
                if (seg.h <= 0) return null;
                y -= seg.h;
                return <rect key={seg.key} x={x} y={y} width={barW} height={seg.h} className={seg.className} rx={2} />;
              })}
              <text x={padLeft + i * stepX} y={h - 8} textAnchor="middle" className="chart-axis">
                {p.label.slice(5)}
              </text>
            </g>
          );
        })}

        <path d={idealPath} className="burndown-ideal-line" />
        <path d={burndownPath} className="burndown-actual-line" />

        {series.map((p, i) => {
          const v = remaining[i] ?? 0;
          const pt = pointXY(v, i);
          return <circle key={`pt-${p.label}`} cx={pt.x} cy={pt.y} r={3.5} className="burndown-point" />;
        })}

        <text x={padLeft} y={14} className="burndown-legend-label">
          Period total: {total} · Remaining: {remaining[remaining.length - 1] ?? 0}
        </text>
        <g transform={`translate(${w - padRight - 118}, 8)`}>
          <rect x={0} y={0} width={10} height={10} className="burndown-stack-low" rx={2} />
          <text x={14} y={9} className="burndown-legend-label">
            Low
          </text>
          <rect x={42} y={0} width={10} height={10} className="burndown-stack-medium" rx={2} />
          <text x={56} y={9} className="burndown-legend-label">
            Med
          </text>
          <rect x={88} y={0} width={10} height={10} className="burndown-stack-high" rx={2} />
          <text x={102} y={9} className="burndown-legend-label">
            High
          </text>
        </g>
      </svg>
    </div>
  );
}
