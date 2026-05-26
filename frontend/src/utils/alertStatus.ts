/** True when alert status should appear on SAR/SMR filed queues (demo). */
export function isSarFiledStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("sar") || s.includes("smr") || s.includes("filed");
}
