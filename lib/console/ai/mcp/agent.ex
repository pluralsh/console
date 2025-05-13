defmodule Console.AI.MCP.Agent do
  @moduledoc """
  This module will handle the connection lifetime for the MCP servers associated with a thread. This is mainly:
  * retaining connections while in use
  * caching and exposing supported tools via a clear interface
  * delivering tool calls to end servers
  """
  use GenServer, restart: :transient
  alias Console.Repo
  alias Console.Schema.{ChatThread, McpServer, Flow}
  alias Console.AI.MCP.{State, ClientSupervisor, Tool}
  require Logger

  @sep "__sep__"

  @poll :timer.minutes(5)

  def sep(), do: @sep

  def registry(), do: __MODULE__

  @doc """
  Fetches the tools registered within this agent
  """
  @spec tools(pid) :: [Tool.t]
  def tools(pid), do: GenServer.call(pid, :tools, 60_000)

  @doc """
  Invokes an individual tool within this agent
  """
  @spec invoke(pid, binary, map) :: {:ok, binary} | Console.error
  def invoke(pid, name, args), do: GenServer.call(pid, {:invoke, name, args}, 60_000)

  def start(%ChatThread{} = thread) do
    GenServer.start(__MODULE__, thread, name: via(thread))
  end

  def start_link([%ChatThread{} = thread]), do: start_link(thread)
  def start_link(%ChatThread{} = thread) do
    GenServer.start_link(__MODULE__, thread, name: via(thread))
  end

  def init(%ChatThread{} = thread) do
    thread = Repo.preload(thread, [user: :groups, flow: :servers])
    {:ok, _} = ClientSupervisor.start_link(thread)
    :timer.send_interval(@poll, :ping)
    send self(), :init
    {:ok, %State{thread: thread, last_used: Timex.now()}}
  end

  def handle_call(:tools, _, %State{tools: tools} = state) do
    tools = Enum.map(tools, fn {name, %Tool{} = tool} -> %{tool | name: name} end)
    {:reply, tools, State.touch(state)}
  end

  def handle_call({:invoke, name, args}, _, %State{thread: thread} = state) do
    with {sname, name} <- tool_name(name),
         %McpServer{} = server <- Enum.find(servers(thread), & &1.name == sname) do
      name(:client, thread, server)
      |> Hermes.Client.call_tool(name, args)
      |> case do
        {:ok, %Hermes.MCP.Response{result: %{"content" => content}}} ->
          {:reply, {:ok, concat_content(content)}, State.touch(state)}
        {:error, error} ->
          {:reply, {:error, "MCP Server #{server.name} has error: #{inspect(error)}"}, State.touch(state)}
      end
    else
      _ -> {:reply, {:error, "invalid tool name: #{name}"}, State.touch(state)}
    end
  end

  def handle_info(:init, %State{thread: thread} = state) do
    Logger.info "starting mcp agent for thread: #{thread.id}"
    state = Enum.reduce(servers(thread), state, fn server, %State{tools: tools} = state ->
      case Console.Retrier.retry(fn -> Hermes.Client.list_tools(name(:client, thread, server)) end) do
        {:ok, %Hermes.MCP.Response{result: %{"tools" => found}}} ->
          new_tools = Map.new(found, & {tool_name(server, &1["name"]), Tool.new(&1)})
          %{state | tools: Map.merge(tools, new_tools)}
        err ->
          Logger.warning "failed to list tools for mcp server: #{server.url}: #{inspect(err)}"
          Process.send_after(self(), :init, 1000)
          state
      end
    end)
    {:noreply, State.touch(state)}
  end

  def handle_info(:ping, %State{last_used: used} = state) do
    Timex.now()
    |> Timex.shift(seconds: -30)
    |> Timex.before?(used)
    |> case do
      true -> {:stop, {:shutdown, :expired}, state}
      false -> {:noreply, state}
    end
  end

  def handle_info(_, state), do: {:noreply, state}

  def servers(%ChatThread{flow: %Flow{servers: [_ | _] = servers}}), do: servers
  def servers(_), do: []

  def tool_name(pref, name) when is_binary(pref), do: "#{pref}#{@sep}#{name}"
  def tool_name(%McpServer{name: sn}, name), do: "#{sn}#{@sep}#{name}"

  def tool_name(name) when is_binary(name) do
    case String.split(name, @sep) do
      [tool | rest] -> {tool, Enum.join(rest, @sep)}
      _ -> :error
    end
  end

  def name(:client, %ChatThread{id: id}, %McpServer{id: mip}),
    do: {:via, Registry, {registry(), {:client, id, mip}}}
  def name(:transport, %ChatThread{id: id}, %McpServer{id: mip}),
    do: {:via, Registry, {registry(), {:transport, id, mip}}}

  defp via(%ChatThread{id: id}), do: {:via, Registry, {registry(), {:thread, id}}}

  defp concat_content(content) do
    Enum.map(content, fn
      %{"type" => "text", "text" => t} -> t
      _ -> ""
    end)
    |> IO.iodata_to_binary()
  end
end
