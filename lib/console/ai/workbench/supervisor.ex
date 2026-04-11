defmodule Console.AI.Workbench.Supervisor do
  use Supervisor
  alias Console.AI.Workbench.{Environment, MCP}
  alias Console.Schema.{WorkbenchJob, WorkbenchTool, McpServer}
  alias Console.AI.MCP.Agent

  def start_link(%Environment{} = env) do
    Supervisor.start_link(__MODULE__, env)
  end

  @impl true
  def init(%Environment{} = env) do
    Map.values(env.tools)
    |> Enum.filter(&MCP.mcp?/1)
    |> Enum.map(&client_child(&1, env.job))
    |> Supervisor.init(strategy: :one_for_one)
  end

  def client_child(%WorkbenchTool{} = t, %WorkbenchJob{} = job) do
    module = client_module(t)

    module.child_spec([
      client_name: Agent.name(:client, t, job),
      transport_name: Agent.name(:transport, t, job),
      transport: MCP.transport(t, job)
    ])
    |> Map.put(:restart, :transient)
  end

  def client_module(%WorkbenchTool{mcp_server: %McpServer{protocol: :sse}}), do: Console.AI.MCP.LegacyClient
  def client_module(_), do: Console.AI.MCP.Client
end
