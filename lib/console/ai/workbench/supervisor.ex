defmodule Console.AI.Workbench.Supervisor do
  use Supervisor
  alias Console.AI.Workbench.{Environment, MCP}
  alias Console.Schema.{WorkbenchJob, WorkbenchTool, McpServer}
  alias Console.AI.MCP.{Agent, ClientSupervisor}

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
    %{
      id: Agent.name(:client, t, job),
      start: {Anubis.Client, :start_link, [[
        name: Agent.name(:client, t, job),
        transport_name: Agent.name(:transport, t, job),
        transport: MCP.transport(t, job)
      ] ++ mcp_attrs(t)]},
      restart: :transient
    }
  end

  defp mcp_attrs(%WorkbenchTool{mcp_server: %McpServer{} = server}), do: ClientSupervisor.mcp_configuration(server)
  defp mcp_attrs(_), do: ClientSupervisor.mcp_configuration(:ignore)
end
