defmodule Console.AI.MCP.Discovery do
  @moduledoc """
  Responsible for determining which node a given thread agent lives on and starting
  it as needed.
  """
  alias Console.AI.MCP.{Agent, Supervisor, Tool}
  alias Console.Schema.{ChatThread}

  @type error :: Console.error

  @spec tools(ChatThread.t) :: {:ok, [Tool.t]} | error
  def tools(%ChatThread{} = t) do
    with {:ok, pid} <- find(t),
      do: {:ok, Agent.tools(pid)}
  end

  @spec invoke(ChatThread.t, binary, map) :: {:ok, binary} | error
  def invoke(%ChatThread{} = t, tool, args) do
    with {:ok, pid} <- find(t),
      do: Agent.invoke(pid, tool, args)
  end

  def find(%ChatThread{} = thread) do
    case start(thread) do
      {:ok, pid} -> {:ok, pid}
      {:error, {:already_started, pid}} -> {:ok, pid}
      err -> err
    end
  end

  def start(%ChatThread{} = thread) do
    me = node()
    case agent_node(thread) do
      ^me -> Supervisor.start_child(thread)
      n -> :rpc.call(n, Supervisor, :start_child, [thread])
    end
  end

  def agent_node(%ChatThread{id: id}), do: HashRing.Managed.key_to_node(:cluster, id)

  def local?(%ChatThread{} = thred), do: agent_node(thred) == node()
end
