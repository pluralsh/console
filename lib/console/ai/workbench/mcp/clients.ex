defmodule Console.AI.Workbench.MCP.Clients do
  @moduledoc """
  Supervises workbench MCP clients on demand.  There is one client per MCP server (or per
  MCP-backed workbench tool for hosted integrations like Linear), shared by every job that
  uses it and addressable by name, so callers never need a handle to the process.
  """
  use DynamicSupervisor
  alias Console.Repo
  alias Console.AI.Workbench.MCP
  alias Console.AI.Workbench.MCP.Client
  alias Console.AI.MCP.ClientSupervisor
  alias Console.Schema.{WorkbenchTool, McpServer}

  def registry(), do: __MODULE__.Registry

  def start_link(init_arg \\ :ok) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_), do: DynamicSupervisor.init(strategy: :one_for_one)

  @spec key(WorkbenchTool.t) :: {:mcp_server | :workbench_tool, binary}
  def key(%WorkbenchTool{tool: :mcp, mcp_server_id: id}) when is_binary(id), do: {:mcp_server, id}
  def key(%WorkbenchTool{id: id}), do: {:workbench_tool, id}

  @doc "The name the Anubis client for this tool's server is registered under."
  @spec name(WorkbenchTool.t) :: GenServer.name
  def name(%WorkbenchTool{} = tool), do: name(:client, key(tool))

  def name(role, key), do: {:via, Registry, {registry(), {role, key}}}

  @doc """
  Starts the client for this tool's server unless an up to date one is already running.  A
  running client whose server configuration has since changed is replaced.
  """
  @spec ensure_started(WorkbenchTool.t) :: {:ok, pid} | Console.error
  def ensure_started(%WorkbenchTool{} = tool) do
    tool = Repo.preload(tool, :mcp_server)
    key = key(tool)
    fingerprint = fingerprint(tool)

    case Registry.lookup(registry(), {:worker, key}) do
      [{pid, ^fingerprint}] ->
        if GenServer.whereis(name(:client, key)) do
          Client.touch(pid)
          {:ok, pid}
        else
          start(tool, key, fingerprint)
        end
      [{pid, _}] ->
        DynamicSupervisor.terminate_child(__MODULE__, pid)
        start(tool, key, fingerprint)
      [] -> start(tool, key, fingerprint)
    end
  end

  defp start(tool, key, fingerprint) do
    with {:ok, opts} <- client_opts(tool, key) do
      case DynamicSupervisor.start_child(__MODULE__, {Client, {key, fingerprint, opts}}) do
        {:ok, pid} -> {:ok, pid}
        {:error, {:already_started, pid}} -> {:ok, pid}
        {:error, error} -> {:error, "failed to start MCP client for #{tool.name}: #{inspect(error)}"}
      end
    end
  end

  # transports can exchange or mint credentials, so they're resolved here rather than in the
  # worker's init, which would block every other start behind the supervisor
  defp client_opts(%WorkbenchTool{} = tool, key) do
    {:ok, [
      name: name(:client, key),
      transport_name: name(:transport, key),
      transport: MCP.transport(tool)
    ] ++ ClientSupervisor.mcp_configuration(server(tool), client_name(key))}
  rescue
    e -> {:error, "failed to configure MCP client for #{tool.name}: #{Exception.message(e)}"}
  end

  defp server(%WorkbenchTool{mcp_server: %McpServer{} = server}), do: server
  defp server(_), do: :ignore

  defp client_name({_, id}), do: "Plural-#{id}"

  defp fingerprint(%WorkbenchTool{tool: :mcp, mcp_server: %McpServer{} = s}),
    do: :erlang.phash2({s.url, s.protocol, s.authentication})
  defp fingerprint(%WorkbenchTool{tool: tool, configuration: conf}), do: :erlang.phash2({tool, conf})
end
