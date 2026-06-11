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
        title = _title_from_markdown(text) or path.stem.replace("_", " ").title()
        chunks.append(RegulatoryChunk(doc_id=path.stem, title=title, text=text, tags=_infer_tags(text)))
    return chunks


def _title_from_markdown(text: str) -> str | None:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return None


def _infer_tags(text: str) -> list[str]:
    t = text.lower()
    tags: list[str] = []
    if "austrac" in t:
        tags.append("AUSTRAC")
    if "smr" in t or "suspicious matter" in t:
        tags.append("SMR")
    if "cdd" in t or "due diligence" in t:
        tags.append("CDD")
    if "pep" in t or "politically exposed" in t:
        tags.append("PEP")
    if "monitoring" in t:
        tags.append("MONITORING")
    return tags


_QUERY_STOP = frozenset(
    {
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
    }
)


def _tokenize_query(query: str) -> set[str]:
    """Split on spaces, underscores, and hyphens; drop short tokens and stop words."""

    tokens: set[str] = set()
    normalized = query.lower().replace(",", " ")
    for part in normalized.split():
        if len(part) <= 2 or part in _QUERY_STOP:
            continue
        tokens.add(part)
        for piece in part.replace("-", "_").split("_"):
            if len(piece) > 2 and piece not in _QUERY_STOP:
                tokens.add(piece)
    return tokens


def _doc_id_match_boost(query: str, doc_id: str) -> float:
    q = query.lower().strip()
    doc = doc_id.lower()
    doc_spaced = doc.replace("_", " ")
    q_compact = q.replace(" ", "_").replace("-", "_")
    if doc in q_compact or doc_spaced in q:
        return 10.0
    if all(piece in q_compact for piece in doc.split("_") if len(piece) > 2):
        return 6.0
    return 0.0


def retrieve(query: str, corpus: list[RegulatoryChunk], top_k: int = 4) -> list[RetrievedChunk]:
    """Cheap lexical retrieval for demos without embeddings API."""

    q_tokens = _tokenize_query(query)
    scored: list[RetrievedChunk] = []
    for c in corpus:
        hay = (c.doc_id + " " + c.title + " " + c.text + " " + " ".join(c.tags)).lower()
        overlap = sum(1 for tok in q_tokens if tok in hay)
        overlap += int(_doc_id_match_boost(query, c.doc_id))
        scored.append(RetrievedChunk(chunk=c, score=float(overlap)))
    scored.sort(key=lambda x: (-x.score, x.chunk.doc_id))
    return scored[:top_k]
