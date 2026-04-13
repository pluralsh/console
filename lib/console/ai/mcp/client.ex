defmodule Console.AI.MCP.Client do
  use Hermes.Client,
    name: "Plural",
    version: "1.0.0",
    protocol_version: "2025-03-26",
    capabilities: [:roots, :sampling]
end

defmodule Console.AI.MCP.LegacyClient do
  use Hermes.Client,
    name: "Plural",
    version: "1.0.0",
    protocol_version: "2024-11-05",
    capabilities: [:roots, :sampling]
end
