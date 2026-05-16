"""Demo compliance Q&A: retrieval over local regulatory markdown (not legal advice)."""

from pathlib import Path
from typing import Any

from agents.rag import RegulatoryChunk, load_regulatory_chunks, retrieve
from app.config import get_settings, regulatory_docs_dir


def _corpus_paths() -> list[Path]:
    settings = get_settings()
    paths = [regulatory_docs_dir(settings)]
    # Repo layout: `data/regulatory` often lives at monorepo root (parent of `backend/`).
    backend_dir = Path(__file__).resolve().parents[2]
    paths.append(backend_dir.parent / "data" / "regulatory")
    return paths


def _load_corpus() -> list[RegulatoryChunk]:
    seen: set[str] = set()
    out: list[RegulatoryChunk] = []
    for base in _corpus_paths():
        if not base.is_dir():
            continue
        for c in load_regulatory_chunks(base):
            if c.doc_id in seen:
                continue
            seen.add(c.doc_id)
            out.append(c)
    return out


def synthesize_compliance_reply(message: str, context: dict[str, Any] | None) -> dict[str, Any]:
    corpus = _load_corpus()
    retrieved = retrieve(message, corpus, top_k=4) if corpus else []
    positive = [r for r in retrieved if r.score > 0]
    shown = positive if positive else retrieved[:2]

    lines: list[str] = [
        "**Compliance Agent** — AUSTRAC / AML–CTF framing (demo assistant, **not** legal advice)\n",
    ]

    if context:
        if (n := context.get("alert_count")) is not None:
            lines.append(f"_Dashboard context: **{n}** alert(s) currently on the queue._")
        if (h := context.get("high_risk_count")) is not None:
            lines.append(f"_High / elevated queue items (heuristic): **{h}**._")
        if lines[-1].startswith("_"):
            lines.append("")  # spacer

    if not corpus:
        lines.append(
            "No regulatory excerpts are available on disk (`data/regulatory`). "
            "Add Markdown sources or check `regulatory_docs_path` in settings."
        )
        return {"reply": "\n".join(lines).strip(), "sources": []}

    if not shown:
        lines.append(
            "I couldn’t match your question tightly to the local corpus. Try terms like "
            "**SMR**, **CDD**, **PEP**, **monitoring**, or **AUSTRAC**."
        )
        return {"reply": "\n".join(lines).strip(), "sources": []}

    lines.append("Grounded excerpts from the **demo corpus**:\n")

    sources: list[dict[str, Any]] = []
    for i, r in enumerate(shown, start=1):
        excerpt = r.chunk.text.strip().replace("\n", " ")
        if len(excerpt) > 480:
            excerpt = excerpt[:480] + "…"
        lines.append(f"{i}. **{r.chunk.title}** ({r.chunk.doc_id}) — _{excerpt}_")
        sources.append({"doc_id": r.chunk.doc_id, "title": r.chunk.title, "score": r.score})

    lines.append(
        "\n---\n**Next steps:** map decisions to your ML/CTF programme & internal policy; escalate to compliance "
        "for SMR thresholds and timelines."
    )
    return {"reply": "\n".join(lines).strip(), "sources": sources}
