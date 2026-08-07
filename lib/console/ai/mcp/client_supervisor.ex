defmodule Console.AI.MCP.ClientSupervisor do
  use Supervisor

  alias Console.Schema.{ChatThread, McpServer, User, WorkbenchJob, WorkbenchTool}
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
        transport: {proto, [headers: auth_headers(t, s)] ++ url_arguments(url)}
      ] ++ mcp_configuration(s, client_name(t, s))]},
      restart: :transient
    }
  end

  def url_arguments(url) do
    case URI.parse(url) do
      %URI{path: path, query: query} ->
        p = uri_path(path, query)
        [base_url: String.replace_trailing(url, p, ""), mcp_path: p]
      _ -> [base_url: url]
    end
  end

  defp uri_path(path, query) when is_binary(query) and byte_size(query) > 0, do: "#{path}?#{query}"
  defp uri_path(path, _) when is_binary(path) and byte_size(path) > 0, do: path
  defp uri_path(_, _), do: "/"

  @mcp_client_version "1.0.0"

  def mcp_configuration(%McpServer{protocol: protocol}, client_name) do
    [client_info: %{"name" => client_name, "version" => @mcp_client_version}]
    |> Keyword.put(
      :protocol_version,
      if(protocol == :sse, do: "2024-11-05", else: "2025-06-18")
    )
  end

  def mcp_configuration(_, client_name),
    do: [client_info: %{"name" => client_name, "version" => @mcp_client_version}, protocol_version: "2025-06-18"]

  def client_name(%ChatThread{id: thread_id}, %McpServer{id: server_id}),
    do: "Plural-#{thread_id}-#{server_id}"

  def client_name(%WorkbenchTool{id: tool_id}, %WorkbenchJob{id: job_id}),
    do: "Plural-#{tool_id}-#{job_id}"

  defp auth_headers(%ChatThread{user: %User{} = user}, %McpServer{authentication: %{plural: true}}) do
    {:ok, jwt, _} = MCP.mint(user)
    %{"Authorization" => "Bearer #{jwt}"}
  end
  defp auth_headers(_, %McpServer{authentication: %{headers: [_ | _] = headers}}),
    do: Map.new(headers, &{&1.name, &1.value})
  defp auth_headers(_, _), do: %{}
end
