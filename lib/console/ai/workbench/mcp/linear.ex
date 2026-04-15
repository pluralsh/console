defmodule Console.AI.Workbench.MCP.Linear do
  @behaviour Console.AI.Workbench.MCP
  alias Console.Schema.{WorkbenchTool}

  @base_url "https://mcp.linear.app"

  def transport(%WorkbenchTool{tool: :linear, configuration: %{linear: %{access_token: access_token}}}, _),
    do: {:streamable_http, [base_url: @base_url, headers: headers(access_token)]}

  defp headers(access_token) do
    %{"Authorization" => "Bearer #{access_token}"}
  end
end
