defmodule Console.AI.Workbench.MCP.Exa do
  @behaviour Console.AI.Workbench.MCP
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.Configuration.ExaConnection

  @base_url "https://mcp.exa.ai"

  def transport(%WorkbenchTool{tool: :exa, configuration: %{exa: exa}}, _),
    do: {:streamable_http, [base_url: @base_url, mcp_path: path(exa, Console.conf(:exa_api_key))]}

  defp path(%ExaConnection{api_key: api_key}, _) when is_binary(api_key),
    do: "/mcp?apiKey=#{api_key}&tools=web_search_exa,web_fetch_exa"
  defp path(_, api_key) when is_binary(api_key), do: "/mcp?apiKey=#{api_key}&tools=web_search_exa,web_fetch_exa"
  defp path(_, _), do: "/mcp?tools=web_search_exa,web_fetch_exa"
end
