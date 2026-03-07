defmodule Console.AI.Workbench.MCP.Sentry do
  @behaviour Console.AI.Workbench.MCP
  alias Console.Schema.WorkbenchTool

  def transport(%WorkbenchTool{tool: :sentry, configuration: %{sentry: sentry}}, _),
    do: {:streamable_http, sentry_transport(sentry)}

  defp sentry_transport(%{url: url, access_token: access_token, path: path, agent_mode: agent_mode}) do
    sentry_url(url || "https://mcp.sentry.dev/mcp", path)
    |> sentry_agent_mode(agent_mode)
    |> then(& [base_url: &1, headers: %{"Authorization" => "Bearer #{access_token}"}])
  end

  defp sentry_url(base_url, path) when is_binary(path) and byte_size(path) > 0 do
    URI.merge(base_url, path)
    |> URI.to_string()
  end
  defp sentry_url(base_url, _), do: base_url

  defp sentry_agent_mode(path, true) do
    URI.parse(path)
    |> Map.put(:query, URI.encode_query(%{"agent" => "1"}))
    |> URI.to_string()
  end
  defp sentry_agent_mode(path, _), do: path
end
