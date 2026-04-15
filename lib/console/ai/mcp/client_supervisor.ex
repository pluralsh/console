defmodule Console.AI.MCP.ClientSupervisor do
  use Supervisor

  alias Console.Schema.{ChatThread, McpServer, User}
  alias Console.AI.MCP.Agent
  alias Console.Jwt.MCP

  def start_link(%ChatThread{} = t) do
    Supervisor.start_link(__MODULE__, t)
  end

  @impl true
  def init(%ChatThread{} = t) do
    Console.Repo.preload(t, [flow: :servers])
    |> Agent.servers()
    |> Enum.map(&server_child(t, &1))
    |> Supervisor.init(strategy: :one_for_one)
  end

  def server_child(%ChatThread{} = t, %McpServer{url: url, protocol: proto} = s) do
    proto = proto || :sse

    %{
      id: Agent.name(:client, t, s),
      start: {Anubis.Client, :start_link, [[
        name: Agent.name(:client, t, s),
        transport_name: Agent.name(:transport, t, s),
        transport: {proto, [base_url: url, headers: auth_headers(t, s)]}
      ] ++ mcp_configuration(s)]},
      restart: :transient
    }
  end

  @mcp_client_info [client_info: %{"name" => "Plural", "version" => "1.0.0"}]

  def mcp_configuration(%McpServer{protocol: :sse}),
    do: Keyword.put(@mcp_client_info, :protocol_version, "2025-03-26")
  def mcp_configuration(_), do: Keyword.put(@mcp_client_info, :protocol_version, "2025-06-18")

  defp auth_headers(%ChatThread{user: %User{} = user}, %McpServer{authentication: %{plural: true}}) do
    {:ok, jwt, _} = MCP.mint(user)
    %{"Authorization" => "Bearer #{jwt}"}
  end
  defp auth_headers(_, %McpServer{authentication: %{headers: [_ | _] = headers}}),
    do: Map.new(headers, &{&1.name, &1.value})
  defp auth_headers(_, _), do: %{}
end
