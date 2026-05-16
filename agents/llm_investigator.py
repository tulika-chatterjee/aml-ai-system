"""LLM Investigator agent — RAG-grounded narrative; template fallback without API keys."""

from typing import Any

from app.config import get_settings, regulatory_docs_dir
from agents.rag import RegulatoryChunk, load_regulatory_chunks, retrieve


def _template_explanation(
    *,
    account_id: str,
    rule_summaries: list[str],
    ml_bits: dict[str, Any],
    graph_bits: dict[str, Any],
    rag_snippets: list[str],
) -> str:
    rag_block = "\n".join(f"- {s[:400]}..." if len(s) > 400 else f"- {s}" for s in rag_snippets)
    rules_block = "\n".join(f"- {r}" for r in rule_summaries)
    return (
        f"## Case narrative (explainable hybrid)\n\n"
        f"**Subject account:** `{account_id}`\n\n"
        f"### Rule engine (auditable triggers)\n{rules_block}\n\n"
        f"### ML behavioural layer\n"
        f"- Anomaly score: **{ml_bits.get('anomaly_score', 0):.3f}** "
        f"(isolation forest on velocity / concentration / time-of-day features)\n"
        f"- Flagged as behavioural outlier: **{ml_bits.get('is_anomaly', False)}**\n\n"
        f"### Graph intelligence\n"
        f"- Cluster size: **{graph_bits.get('cluster_size', 1)}**, "
        f"large-value edge ratio: **{graph_bits.get('suspicious_edge_ratio', 0):.2f}**\n\n"
        f"### Regulatory / policy context (retrieved)\n{rag_block or '- (no corpus loaded)'}\n\n"
        f"*This summary is for demonstration. Production systems require institutional legal "
        f"review and configured SMR workflows.*"
    )


async def synthesize_case_summary(
    *,
    account_id: str,
    triggers: list[dict[str, Any]],
    ml_contribution: dict[str, Any],
    graph_signals: dict[str, Any],
    investigator_question: str | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    corpus_path = regulatory_docs_dir(settings)
    corpus: list[RegulatoryChunk] = load_regulatory_chunks(corpus_path)

    q_parts = [investigator_question or "Why was this flagged for AML review?", account_id]
    q_parts.extend(t.get("description", "") for t in triggers)
    query = " ".join(q_parts)
    retrieved = retrieve(query, corpus, top_k=4)
    rag_snippets = [r.chunk.text.strip().replace("\n", " ")[:600] for r in retrieved if r.score > 0]
    if not rag_snippets and corpus:
        rag_snippets = [c.text.strip().replace("\n", " ")[:600] for c in corpus[:2]]

    rule_summaries = [f"{t.get('rule_id')}: {t.get('description')}" for t in triggers]

    explanation: str
    model_used = "template"

    if settings.openai_api_key:
        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(model=settings.llm_model, temperature=0.1, api_key=settings.openai_api_key)
            sys = SystemMessage(
                content=(
                    "You are an AU AML compliance assistant. Ground answers in the CONTEXT snippets. "
                    "Be explicit about uncertainty. Reference rule IDs when provided. "
                    "Do not claim certainty of crime."
                )
            )
            ctx = "\n---\n".join(rag_snippets) if rag_snippets else "(no retrieved regulatory text)"
            human = HumanMessage(
                content=(
                    f"CONTEXT:\n{ctx}\n\nQUESTION:\n{query}\n\n"
                    f"Structured signals:\nRules: {triggers}\nML: {ml_contribution}\nGraph: {graph_signals}"
                )
            )
            resp = await llm.ainvoke([sys, human])
            explanation = str(resp.content)
            model_used = settings.llm_model
        except Exception:
            explanation = _template_explanation(
                account_id=account_id,
                rule_summaries=rule_summaries,
                ml_bits=ml_contribution,
                graph_bits=graph_signals,
                rag_snippets=rag_snippets,
            )
            model_used = "template-fallback-after-error"
    else:
        explanation = _template_explanation(
            account_id=account_id,
            rule_summaries=rule_summaries,
            ml_bits=ml_contribution,
            graph_bits=graph_signals,
            rag_snippets=rag_snippets,
        )

    return {
        "explanation_markdown": explanation,
        "model_used": model_used,
        "retrieval": [
            {"doc_id": r.chunk.doc_id, "title": r.chunk.title, "score": r.score} for r in retrieved
        ],
    }
