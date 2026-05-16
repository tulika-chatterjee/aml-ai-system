"""High-ROI MCP-style tool stubs — swap bodies for real integrations."""

from dataclasses import dataclass


@dataclass(frozen=True)
class MCPToolStub:
    name: str
    description: str
    expected_transport: str


MANIFEST: tuple[MCPToolStub, ...] = (
    MCPToolStub(
        name="sanctions.lookup",
        description="Screen names and identifiers against sanctions / PEP datasets.",
        expected_transport="HTTP MCP bridge → vendor API",
    ),
    MCPToolStub(
        name="adverse_media.search",
        description="Retrieve adverse news with jurisdictional and entity-resolution safeguards.",
        expected_transport="HTTP MCP bridge → media API",
    ),
    MCPToolStub(
        name="graph.cypher",
        description="Execute constrained Cypher against AML graph projections.",
        expected_transport="Neo4j MCP adapter",
    ),
    MCPToolStub(
        name="features.feast",
        description="Fetch point-in-time AML features from a feature store.",
        expected_transport="gRPC / REST MCP bridge",
    ),
    MCPToolStub(
        name="documents.parse_kyc",
        description="Extract structured fields from KYC evidence packs.",
        expected_transport="document MCP worker",
    ),
)


def describe_manifest() -> list[dict[str, str]]:
    return [
        {"name": t.name, "description": t.description, "transport": t.expected_transport}
        for t in MANIFEST
    ]
