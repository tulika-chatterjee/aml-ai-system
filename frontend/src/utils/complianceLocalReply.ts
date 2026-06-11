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

const QUERY_STOP = new Set([
  "what",
  "is",
  "are",
  "the",
  "a",
  "an",
  "how",
  "when",
  "where",
  "why",
  "does",
  "do",
  "can",
  "could",
  "should",
  "would",
  "about",
  "tell",
  "me",
  "explain",
  "define",
  "meaning",
  "of",
  "for",
  "and",
  "or",
]);

function tokenizeQuery(query: string): Set<string> {
  const tokens = new Set<string>();
  const normalized = query.toLowerCase().replace(/,/g, " ");
  for (const part of normalized.split(/\s+/)) {
    if (part.length <= 2 || QUERY_STOP.has(part)) continue;
    tokens.add(part);
    for (const piece of part.replace(/-/g, "_").split("_")) {
      if (piece.length > 2 && !QUERY_STOP.has(piece)) tokens.add(piece);
    }
  }
  return tokens;
}

function docIdMatchBoost(query: string, docId: string): number {
  const q = query.toLowerCase().trim();
  const doc = docId.toLowerCase();
  const docSpaced = doc.replace(/_/g, " ");
  const qCompact = q.replace(/\s+/g, "_").replace(/-/g, "_");
  if (qCompact.includes(doc) || q.includes(docSpaced)) return 10;
  const pieces = doc.split("_").filter((p) => p.length > 2);
  if (pieces.length > 0 && pieces.every((p) => qCompact.includes(p))) return 6;
  return 0;
}

function formatChunkAnswer(text: string): string[] {
  return text
    .trim()
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("# "));
}

function nextStepsFooter(topDocId: string): string {
  if (topDocId === "cdd_pep_enhanced") {
    return "\n---\n**Next steps:** apply your ML/CTF programme’s PEP / enhanced CDD policy; obtain senior management approval where required; document source-of-wealth measures and ongoing monitoring.";
  }
  if (topDocId === "austrac_smr_guidance_stub") {
    return "\n---\n**Next steps:** document analyst facts, indicators, and suspicion decision; escalate to compliance for SMR thresholds and AUSTRAC timelines.";
  }
  return "\n---\n**Next steps:** map decisions to your ML/CTF programme & internal policy; escalate to compliance for SMR thresholds and timelines.";
}

function retrieveLocal(query: string, topK: number): { chunk: LocalChunk; score: number }[] {
  const qTokens = tokenizeQuery(query);
  const scored = CORPUS.map((c) => {
    const hay = (c.doc_id + " " + c.title + " " + c.text).toLowerCase();
    let overlap = 0;
    for (const tok of qTokens) {
      if (hay.includes(tok)) overlap += 1;
    }
    overlap += docIdMatchBoost(query, c.doc_id);
    return { chunk: c, score: overlap };
  });
  scored.sort((a, b) => b.score - a.score || a.chunk.doc_id.localeCompare(b.chunk.doc_id));
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

  if (!shown.length || shown[0].score <= 0) {
    lines.push(
      "I couldn’t match your question tightly to the local corpus. Try terms like **SMR**, **CDD**, **PEP**, **cdd_pep_enhanced**, **monitoring**, or **AUSTRAC**.",
    );
    return lines.join("\n").trim();
  }

  const top = shown[0];
  lines.push(`**${top.chunk.title}** (\`${top.chunk.doc_id}\`)\n`);
  lines.push(...formatChunkAnswer(top.chunk.text));

  const related = shown.slice(1).filter((r) => r.score > 0 && r.chunk.doc_id !== top.chunk.doc_id);
  if (related.length) {
    lines.push("\n**Related corpus excerpts:**\n");
    related.forEach((r, i) => {
      let excerpt = r.chunk.text.replace(/\n+/g, " ").trim();
      if (excerpt.length > 320) excerpt = excerpt.slice(0, 320) + "…";
      lines.push(`${i + 1}. **${r.chunk.title}** (\`${r.chunk.doc_id}\`) — _${excerpt}_`);
    });
  }

  lines.push(nextStepsFooter(top.chunk.doc_id));
  return lines.join("\n").trim();
}
