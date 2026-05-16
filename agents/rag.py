"""Minimal RAG corpus loader — regulatory + policy snippets for investigator agent."""

from pathlib import Path
from typing import NamedTuple

from pydantic import BaseModel


class RegulatoryChunk(BaseModel):
    doc_id: str
    title: str
    text: str
    tags: list[str]


class RetrievedChunk(NamedTuple):
    chunk: RegulatoryChunk
    score: float


def load_regulatory_chunks(base_dir: str | Path) -> list[RegulatoryChunk]:
    base = Path(base_dir)
    chunks: list[RegulatoryChunk] = []
    if not base.exists():
        return chunks
    for path in sorted(base.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        title = path.stem.replace("_", " ").title()
        chunks.append(RegulatoryChunk(doc_id=path.stem, title=title, text=text, tags=_infer_tags(text)))
    return chunks


def _infer_tags(text: str) -> list[str]:
    t = text.lower()
    tags: list[str] = []
    if "austrac" in t:
        tags.append("AUSTRAC")
    if "smr" in t or "suspicious matter" in t:
        tags.append("SMR")
    if "cdd" in t or "due diligence" in t:
        tags.append("CDD")
    if "monitoring" in t:
        tags.append("MONITORING")
    return tags


def retrieve(query: str, corpus: list[RegulatoryChunk], top_k: int = 4) -> list[RetrievedChunk]:
    """Cheap lexical retrieval for demos without embeddings API."""

    q_tokens = set(query.lower().replace(",", " ").split())
    scored: list[RetrievedChunk] = []
    for c in corpus:
        hay = (c.title + " " + c.text).lower()
        overlap = sum(1 for tok in q_tokens if len(tok) > 2 and tok in hay)
        scored.append(RetrievedChunk(chunk=c, score=float(overlap)))
    scored.sort(key=lambda x: x.score, reverse=True)
    return scored[:top_k]
