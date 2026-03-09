defmodule Console.AI.Workbench.Supervisor do
  use Supervisor
  alias Console.AI.Workbench.{Environment, MCP}
  alias Console.Schema.{WorkbenchJob, WorkbenchTool}
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
    Console.AI.MCP.Client.child_spec([
      client_name: Agent.name(:client, t, job),
      transport_name: Agent.name(:transport, t, job),
      transport: MCP.transport(t, job)
    ])
    |> Map.put(:restart, :transient)
  end
end
