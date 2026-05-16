"""Graph intelligence agent — NetworkX metrics today; Neo4j credentials reserved for future MCP wiring."""

from dataclasses import dataclass
from typing import Any

import networkx as nx


@dataclass
class GraphInsight:
    cluster_size: int
    suspicious_edge_ratio: float
    nodes: list[str]
    edges: list[tuple[str, str, dict[str, Any]]]
    source: str


class GraphIntelService:
    def __init__(self, uri: str, user: str, password: str) -> None:
        self._uri = uri
        self._user = user
        self._password = password

    async def analyze_account(self, account_id: str, tx_edges: list[tuple[str, str, float]]) -> GraphInsight:
        """tx_edges: (from_acc, to_acc, amount) for recent window."""

        G = nx.DiGraph()
        for u, v, w in tx_edges:
            G.add_edge(u, v, weight=w)

        if account_id not in G:
            return GraphInsight(
                cluster_size=1,
                suspicious_edge_ratio=0.0,
                nodes=[account_id],
                edges=[],
                source="networkx-fallback",
            )

        und = G.to_undirected()
        try:
            cc = max(nx.connected_components(und), key=len)
        except ValueError:
            cc = {account_id}

        subgraph = und.subgraph(cc)
        edges_list: list[tuple[str, str, dict[str, Any]]] = []
        suspicious = 0
        total = 0
        for u, v, data in subgraph.edges(data=True):
            total += 1
            w = float(data.get("weight", 0))
            flag = w >= 9000
            if flag:
                suspicious += 1
            edges_list.append((u, v, {"amount": w, "flag_large": flag}))

        ratio = (suspicious / total) if total else 0.0
        return GraphInsight(
            cluster_size=len(cc),
            suspicious_edge_ratio=ratio,
            nodes=list(cc),
            edges=edges_list[:50],
            source="networkx",
        )
