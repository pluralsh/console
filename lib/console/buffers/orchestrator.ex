defmodule Console.Buffer.Orchestrator do
  alias Console.Buffers.Supervisor

  def submit(buffer, key, job),
    do: maybe_rpc({buffer, key}, __MODULE__, :do_submit, [buffer, key, job])

  def do_submit(buffer, key, job) do
    case Supervisor.start_child(buffer, key, [[name: [{buffer, key}]]]) do
      {:ok, pid} -> buffer.submit(pid, job)
      {:error, {:already_started, pid}} -> buffer.submit(pid, job)
      err -> err
    end
  end

  def worker_node(id), do: Console.ClusterRing.node(id)

  def local?(id), do: worker_node(id) == node()

  defp maybe_rpc(id, module, func, args) do
    me = node()
    case worker_node(id) do
      ^me -> apply(module, func, args)
      node -> :rpc.call(node, module, func, args)
    end
  end
end
