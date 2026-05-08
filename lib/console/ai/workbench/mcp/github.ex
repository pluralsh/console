defmodule Console.AI.Workbench.MCP.Github do
  @behaviour Console.AI.Workbench.MCP
  import Console.AI.Workbench.MCP.Basic, only: [normalize_url: 1]
  alias Console.Schema.WorkbenchTool

  @default_url "https://api.githubcopilot.com"

  def transport(%WorkbenchTool{tool: :github, configuration: %{github: github}}, _),
    do: {:streamable_http, [base_url: base_url(github), mcp_path: path(github), headers: headers(github), enable_sse: true]}

  defp base_url(%{url: url}) when is_binary(url) and byte_size(url) > 0, do: normalize_url(url)
  defp base_url(_), do: normalize_url(@default_url)

  defp path(%{toolset: toolset}) when is_binary(toolset) and byte_size(toolset) > 0,
    do: "/mcp?toolset=#{URI.encode(toolset)}"
  defp path(_), do: "/mcp"

  defp headers(%{access_token: access_token}) when is_binary(access_token),
    do: %{"Authorization" => "Bearer #{access_token}"}
  defp headers(_), do: %{}
end
