defmodule Console.AI.Workbench.MCP.Basic do
  @behaviour Console.AI.Workbench.MCP
  alias Console.Jwt.MCP
  alias Console.Schema.{
    WorkbenchTool,
    McpServer,
    WorkbenchJob,
    User
  }

  def transport(
    %WorkbenchTool{tool: :mcp, mcp_server: %McpServer{protocol: :sse, url: url} = srv},
    %WorkbenchJob{} = job
  ), do: {:sse, [base_url: url, headers: auth_headers(job.user, srv)]}
  def transport(
    %WorkbenchTool{tool: :mcp, mcp_server: %McpServer{protocol: :streamable_http, url: url} = srv},
    %WorkbenchJob{} = job
  ), do: {:streamable_http, [url: url, headers: auth_headers(job.user, srv)]}

  defp auth_headers(%User{} = user, %McpServer{authentication: %{plural: true}} = srv) do
    {:ok, jwt, _} = MCP.mint(user)
    auth_headers(user, put_in(srv.authentication.plural, false))
    |> Map.put("Authorization", "Bearer #{jwt}")
  end
  defp auth_headers(_, %McpServer{authentication: %{headers: [_ | _] = headers}}),
    do: Map.new(headers, &{&1.name, &1.value})
  defp auth_headers(_, _), do: %{}
end
