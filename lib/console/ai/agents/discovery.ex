defmodule Console.AI.Agents.Discovery do
  @moduledoc """
  Manages the sharding process for ai agent runners.  This uses the same consistent hashing approach as git/helm agents,
  eg each agent is modeled as a genserver hashed to a specific node.  In this case they have a fixed 15m
  lifetime as well to avoid infinite loops and other degenerate cases.
  """
  alias Console.Schema.AgentSession
  alias Console.AI.Agents.Supervisor
  require Logger

  def boot(module, %AgentSession{} = session),
    do: maybe_rpc(module, session, &module.boot/1)

  def enqueue(module, %AgentSession{} = session, event) do
    Logger.info("enqueueing event to agent session #{session.id}")
    maybe_rpc(module, session, &module.enqueue(&1, event))
  end

  def maybe_rpc(module, %AgentSession{} = session, fun) when is_function(fun, 1) do
    me = node()
    Logger.info("trying agent session rpc #{inspect(module)} #{session.id}")
    case worker_node(session) do
      ^me -> start_and_run(module, session, fun)
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

  def worker_node(%AgentSession{id: id}), do: Console.ClusterRing.node(id)

  def local?(%AgentSession{} = session), do: worker_node(session) == node()
  def local?(_), do: true
end
