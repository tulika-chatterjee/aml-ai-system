/**
 * Offline Compliance Agent — mirrors backend lexical retrieval over the same demo corpus
 * (bundled excerpts) when POST /api/compliance/chat is unreachable.
 */

export type LocalChunk = { doc_id: string; title: string; text: string };

const CORPUS: LocalChunk[] = [
  {
    doc_id: "austrac_smr_guidance_stub",
    title: "Suspicious Matter Reports — analyst checklist (demo stub)",
    text: `# Suspicious Matter Reports — analyst checklist (demo stub)

When assessing alerts aligned with AUSTRAC expectations (institution-specific policies apply):

1. **Facts**: timeline of transactions, counterparties, instruments, channels.
2. **Indicators**: structuring, rapid movement of funds, anomalies vs customer profile.
3. **Knowledge**: what the reporting entity knew or reasonably suspected at the time.
4. **Decision**: document why an SMR was or was not lodged; retain records per programme obligations.

AI assistants should **summarise evidence**, not replace adjudication or legal review.`,
  },
  {
    doc_id: "austrac_risk_based_monitoring",
    title: "AUSTRAC — Risk-based AML/CTF monitoring (summary)",
    text: `# AUSTRAC — Risk-based AML/CTF monitoring (summary)

Australian reporting entities must adopt a **risk-based approach** under the Anti-Money Laundering and Counter-Terrorism Financing Act 2006 (AML/CTF Act) and Rules. Key ideas relevant to transaction monitoring systems:

- **Proportionality**: Monitoring intensity should reflect ML/TF risk for customers, products, channels, and jurisdictions.
- **Ongoing due diligence**: Customer risk profiles are not static; systems should refresh risk ratings when behaviour changes.
- **SMRs (Suspicious Matter Reports)**: Automated alerts support analysts; **a human must assess suspicion** before reporting to AUSTRAC where thresholds are met.

This demo corpus grounds investigator narratives in risk-based monitoring concepts. It is **not legal advice**.`,
  },
  {
    doc_id: "cdd_pep_enhanced",
    title: "Customer due diligence — PEP & enhanced measures (demo)",
    text: `# Customer due diligence — PEP & enhanced measures (demo)

Politically Exposed Persons (PEPs) may warrant **enhanced customer due diligence** under Part 2 of the AML/CTF Rules instrument (as amended). Programme elements often include:

- Senior management approval for onboarding or continuing relationship.
- Reasonable measures to establish source of wealth / funds for higher-risk PEP relationships.
- Enhanced ongoing monitoring of the business relationship.

PEP status alone is **not** proof of wrongdoing; it elevates monitoring and governance expectations.`,
  },
];

function retrieveLocal(query: string, topK: number): { chunk: LocalChunk; score: number }[] {
  const qTokens = new Set(
    query
      .toLowerCase()
      .replace(/,/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
  const scored = CORPUS.map((c) => {
    const hay = (c.title + " " + c.text).toLowerCase();
    let overlap = 0;
    for (const tok of qTokens) {
      if (hay.includes(tok)) overlap += 1;
    }
    return { chunk: c, score: overlap };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function synthesizeComplianceReplyLocal(
  message: string,
  context: Record<string, unknown> | undefined,
  opts?: { offlineNote?: boolean },
): string {
  const retrieved = retrieveLocal(message, 4);
  const positive = retrieved.filter((r) => r.score > 0);
  const shown = positive.length ? positive : retrieved.slice(0, 2);

  const lines: string[] = [
    "**Compliance Agent** — AUSTRAC / AML–CTF framing (demo assistant, **not** legal advice)\n",
  ];

  if (opts?.offlineNote) {
    lines.push(
      "_**Offline mode** — bundled demo corpus (API on :8000 unavailable). Start the backend for server-synced excerpts._\n",
    );
  }

  if (context) {
    const n = context.alert_count;
    const h = context.high_risk_count;
    if (typeof n === "number") lines.push(`_Dashboard context: **${n}** alert(s) currently on the queue._`);
    if (typeof h === "number") lines.push(`_High / elevated queue items (heuristic): **${h}**._`);
    const last = lines[lines.length - 1];
    if (last?.startsWith("_")) lines.push("");
  }

  if (!shown.length) {
    lines.push(
      "I couldn’t match your question tightly to the local corpus. Try terms like **SMR**, **CDD**, **PEP**, **monitoring**, or **AUSTRAC**.",
    );
    return lines.join("\n").trim();
  }

  lines.push("Grounded excerpts from the **demo corpus**:\n");
  shown.forEach((r, i) => {
    let excerpt = r.chunk.text.replace(/\n+/g, " ").trim();
    if (excerpt.length > 480) excerpt = excerpt.slice(0, 480) + "…";
    lines.push(`${i + 1}. **${r.chunk.title}** (${r.chunk.doc_id}) — _${excerpt}_`);
  });

  lines.push(
    "\n---\n**Next steps:** map decisions to your ML/CTF programme & internal policy; escalate to compliance for SMR thresholds and timelines.",
  );
  return lines.join("\n").trim();
}
