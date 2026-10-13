defmodule Console.AI.Workbench.MCP.Basic do
  @behaviour Console.AI.Workbench.MCP
  alias Console.AI.Provider.TokenExchange
  alias Console.Jwt.MCP
  alias Console.Services.Users
  alias Console.Schema.DeploymentSettings.OauthToken
  alias Console.Schema.{WorkbenchTool, McpServer}

  def transport(%WorkbenchTool{tool: :mcp, mcp_server: %McpServer{protocol: proto, url: url} = srv}),
    do: {proto || :sse, [base_url: normalize_url(url), headers: auth_headers(srv), enable_sse: true]}

  def normalize_url(url), do: String.trim_trailing(url, "/mcp")

  defp auth_headers(%McpServer{authentication: %{oauth: %OauthToken{enabled: enabled} = oauth}})
       when enabled != false do
    case TokenExchange.authorization_header(oauth) do
      {:ok, {name, value}} -> %{name => value}
      {:error, error} -> raise "MCP OAuth token exchange failed: #{error}"
    end
  end

  # clients are shared across every job using the server, so they authenticate as the console
  # bot rather than whichever user happened to start them
  defp auth_headers(%McpServer{authentication: %{plural: true}} = srv) do
    {:ok, jwt, _} = MCP.mint(Users.get_bot!("console"))
    auth_headers(put_in(srv.authentication.plural, false))
    |> Map.put("Authorization", "Bearer #{jwt}")
  end
  defp auth_headers(%McpServer{authentication: %{headers: [_ | _] = headers}}),
    do: Map.new(headers, &{&1.name, &1.value})
  defp auth_headers(_), do: %{}
end
