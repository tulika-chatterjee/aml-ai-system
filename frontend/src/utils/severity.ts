/** Display label and CSS class for alert severity (includes analyst overrides). */

export function displaySeverity(severity: string): string {
  const u = severity.toUpperCase();
  if (u === "FRAUD") return "Fraud";
  if (u === "SAFE") return "Safe";
  if (u === "HIGH") return "High";
  if (u === "MEDIUM") return "Medium";
  if (u === "LOW") return "Low";
  return severity;
}

export function severityCssClass(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "fraud" || s === "safe" || s === "high" || s === "medium" || s === "low") {
    return s;
  }
  return "medium";
}

export function isAnalystSeverity(severity: string): boolean {
  const u = severity.toUpperCase();
  return u === "FRAUD" || u === "SAFE";
}
