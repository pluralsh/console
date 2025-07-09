defmodule Console.AI.Agents.Discovery do
  alias Console.Schema.AgentSession
  alias Console.AI.Agents.Supervisor

  def maybe_rpc(module, %AgentSession{} = session, fun) when is_function(fun, 1) do
    me = node()
    case worker_node(session) do
      ^me -> start_and_run(session, fun)
      node ->
        :erpc.call(node, __MODULE__, :start_and_run, [module, session, fun], :timer.seconds(30))
        |> Console.handle_rpc()
    end
  end

  def start_and_run(module, %AgentSession{} = session, fun) when is_function(fun, 1) do
    case Supervisor.start_child(module, session) do
      {:ok, pid} -> fun.(pid)
      {:error, {:already_started, pid}} -> fun.(pid)
      err -> err
    end
  end
  def start_and_run(_, _), do: {:error, "no helm repository located"}

  def worker_node(%AgentSession{id: id}), do: HashRing.key_to_node(ring(), id)

  def local?(%AgentSession{} = session), do: worker_node(session) == node()

  defp ring() do
    HashRing.new()
    |> HashRing.add_nodes([node() | Node.list()])
  end
end
