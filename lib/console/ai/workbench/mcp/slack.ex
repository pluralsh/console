defmodule Console.AI.Workbench.MCP.Slack do
  @behaviour Console.AI.Workbench.MCP
  alias Console.Schema.WorkbenchTool

  @base_url "https://mcp.slack.com"

  def transport(%WorkbenchTool{tool: :slack, configuration: %{slack: %{bot_token: bot_token}}}, _),
    do: {:streamable_http, [base_url: @base_url, headers: headers(bot_token), enable_sse: true]}

  defp headers(bot_token) do
    %{"Authorization" => "Bearer #{bot_token}"}
  end
end
