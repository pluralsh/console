defmodule Console.AI.MCP.ClientSupervisor do
  # Automatically defines child_spec/1
  use Supervisor

  alias Console.Schema.{ChatThread, McpServer}
  alias Console.AI.MCP.Agent

  def start_link(%ChatThread{} = t) do
    Supervisor.start_link(__MODULE__, t)
  end

  @impl true
  def init(%ChatThread{} = t) do
    Console.Repo.preload(t, [flow: :servers])
    |> Agent.servers()
    |> Enum.flat_map(&server_children(t, &1))
    |> Supervisor.init(strategy: :one_for_one)
  end

  def server_children(%ChatThread{} = t, %McpServer{url: url} = s) do
    [
      {Hermes.Client, [
        name: Agent.name(:client, t, s),
        transport: [
          layer: Hermes.Transport.SSE,
          name: Agent.name(:transport, t, s)
        ],
        client_info: %{
          "name" => "Plural",
          "version" => "1.0.0"
        },
        capabilities: %{"resources" => %{}, "tools" => %{}, "prompts" => %{}, "sampling" => %{}}
      ]},
      {Hermes.Transport.SSE, [
        name: Agent.name(:transport, t, s),
        client: Agent.name(:client, t, s),
        server: [base_url: url]
      ]},
    ]
  end
end
