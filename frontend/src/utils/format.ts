export function formatRuleFlags(triggers: unknown): string {
  if (!Array.isArray(triggers) || triggers.length === 0) return "—";
  return triggers
    .map((t) => {
      if (t && typeof t === "object") {
        const o = t as Record<string, unknown>;
        if (typeof o.rule === "string") return o.rule;
        if (typeof o.name === "string") return o.name;
        if (typeof o.code === "string") return o.code;
      }
      return typeof t === "string" ? t : JSON.stringify(t);
    })
    .join(", ");
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function alertsSeriesLastDays(alerts: { created_at: string }[], days = 7): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    counts.set(localDateKey(d), 0);
  }
  for (const a of alerts) {
    const day = localDateKey(new Date(a.created_at));
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}
