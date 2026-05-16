"""Maps detection artefacts to AUSTRAC-aligned obligations (high-level, non-legal advice)."""

from typing import Any


_RULE_TO_OBLIGATION: dict[str, dict[str, Any]] = {
    "AU-RULE-TM-VEL-001": {
        "obligation": "Ongoing customer due diligence & transaction monitoring (AML/CTF Act Part 10 flavour)",
        "reporting_hint": "May contribute to SMR narrative if suspicion formed — AUSTRAC SMR guidance",
    },
    "AU-RULE-TM-VOL-002": {
        "obligation": "Risk-based transaction monitoring — proportionate to ML/TF risk",
        "reporting_hint": "Threshold monitoring complements—not replaces—suspicion-based reporting",
    },
    "AU-RULE-TCTR-LIKE-003": {
        "obligation": "CTR/TTR-style threshold monitoring (institution-specific policy)",
        "reporting_hint": "Verify institutional threshold reporting vs SMR pathways",
    },
    "AU-RULE-CDD-PEP-010": {
        "obligation": "Enhanced Customer Due Diligence for higher-risk relationships (PEP)",
        "reporting_hint": "Document EDD measures; SMR if suspicion arises",
    },
    "AU-RULE-RBA-HIGH-020": {
        "obligation": "Risk-based approach — differentiated controls for high-risk customers",
        "reporting_hint": "Ensure ML/TF risk assessment is current",
    },
    "AU-RULE-NET-LAYER-030": {
        "obligation": "Holistic monitoring including indirect suspicious indicators",
        "reporting_hint": "Network typologies often cited in SMR factual descriptions",
    },
}


def map_rule_hits(rule_ids: list[str]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for rid in rule_ids:
        meta = _RULE_TO_OBLIGATION.get(rid)
        if meta:
            out.append({"rule_id": rid, **meta})
        else:
            out.append(
                {
                    "rule_id": rid,
                    "obligation": "General AML/CTF programme obligations — verify against entity policy",
                    "reporting_hint": "Analyst review required",
                }
            )
    return out
