defmodule Console.AI.Workbench.MCP.Atlassian do
  @behaviour Console.AI.Workbench.MCP
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.Configuration.AtlassianConnection

  @base_url "https://mcp.atlassian.com/v1/mcp"

  def transport(%WorkbenchTool{tool: :atlassian, configuration: %{atlassian: atlassian}}, _),
    do: {:streamable_http, [base_url: @base_url, headers: headers(atlassian)]}

  defp headers(%AtlassianConnection{service_account: sa}) when is_binary(sa), do: %{"Authorization" => "Bearer #{sa}"}
  defp headers(%AtlassianConnection{api_token: api_key, email: email}) when is_binary(api_key) and is_binary(email),
    do: %{"Authorization" => "Basic #{Base.encode64("#{email}:#{api_key}")}"}
  defp headers(_), do: %{}
end
