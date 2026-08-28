defmodule Console.AI.Workbench.Supervisor do
  use Supervisor
  alias Console.AI.Workbench.{Environment, MCP}
  alias Console.Schema.{WorkbenchJob, WorkbenchTool, McpServer}
  alias Console.AI.MCP.{Agent, ClientSupervisor}

  def start_link(%Environment{} = env) do
    Supervisor.start_link(__MODULE__, env)
  end

  def start_link(tools, %WorkbenchJob{} = job) when is_list(tools) or is_map(tools) do
    tools = if is_map(tools), do: tools, else: Map.new(tools, & {&1.name, &1})
    start_link(%Environment{job: job, tools: tools})
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
      start: {__MODULE__, :start_client, [[
        name: Agent.name(:client, t, job),
        transport_name: Agent.name(:transport, t, job),
        transport: MCP.transport(t, job)
      ] ++ mcp_attrs(t, job)]},
      restart: :transient
    }
  end

  def start_client(opts) do
    case Anubis.Client.start_link(opts) do
      {:ok, pid} -> {:ok, pid}
      {:error, {:already_started, pid}} -> {:ok, pid}
      err -> err
    end
  end

  defp mcp_attrs(%WorkbenchTool{mcp_server: %McpServer{} = server} = tool, job),
    do: ClientSupervisor.mcp_configuration(server, ClientSupervisor.client_name(tool, job))

  defp mcp_attrs(tool, job),
    do: ClientSupervisor.mcp_configuration(:ignore, ClientSupervisor.client_name(tool, job))
end
