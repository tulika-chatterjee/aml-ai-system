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


def _format_chunk_answer(chunk: RegulatoryChunk) -> list[str]:
    """Turn markdown corpus text into readable answer lines (skip duplicate H1)."""

    body_lines: list[str] = []
    for line in chunk.text.strip().splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("# "):
            continue
        body_lines.append(stripped)
    return body_lines


def _next_steps_footer(top_doc_id: str) -> str:
    if top_doc_id == "cdd_pep_enhanced":
        return (
            "\n---\n**Next steps:** apply your ML/CTF programme’s PEP / enhanced CDD policy; "
            "obtain senior management approval where required; document source-of-wealth measures and ongoing monitoring."
        )
    if top_doc_id == "austrac_smr_guidance_stub":
        return (
            "\n---\n**Next steps:** document analyst facts, indicators, and suspicion decision; "
            "escalate to compliance for SMR thresholds and AUSTRAC timelines."
        )
    return (
        "\n---\n**Next steps:** map decisions to your ML/CTF programme & internal policy; "
        "escalate to compliance for SMR thresholds and timelines."
    )


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

    if not shown or shown[0].score <= 0:
        lines.append(
            "I couldn’t match your question tightly to the local corpus. Try terms like "
            "**SMR**, **CDD**, **PEP**, **cdd_pep_enhanced**, **monitoring**, or **AUSTRAC**."
        )
        return {"reply": "\n".join(lines).strip(), "sources": []}

    top = shown[0]
    lines.append(f"**{top.chunk.title}** (`{top.chunk.doc_id}`)\n")
    lines.extend(_format_chunk_answer(top.chunk))

    sources: list[dict[str, Any]] = [
        {"doc_id": top.chunk.doc_id, "title": top.chunk.title, "score": top.score}
    ]

    related = [r for r in shown[1:] if r.score > 0 and r.chunk.doc_id != top.chunk.doc_id]
    if related:
        lines.append("\n**Related corpus excerpts:**\n")
        for i, r in enumerate(related, start=1):
            excerpt = r.chunk.text.strip().replace("\n", " ")
            if len(excerpt) > 320:
                excerpt = excerpt[:320] + "…"
            lines.append(f"{i}. **{r.chunk.title}** (`{r.chunk.doc_id}`) — _{excerpt}_")
            sources.append({"doc_id": r.chunk.doc_id, "title": r.chunk.title, "score": r.score})

    lines.append(_next_steps_footer(top.chunk.doc_id))
    return {"reply": "\n".join(lines).strip(), "sources": sources}
