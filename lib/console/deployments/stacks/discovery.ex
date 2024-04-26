defmodule Console.Deployments.Stacks.Discovery do
  alias Console.Deployments.Stacks.Supervisor
  alias Console.Schema.StackRun

  def runner(%StackRun{} = run), do: maybe_rpc(run.id, Supervisor, :start_child, [run])

  defp maybe_rpc(id, module, func, args) do
    me = node()
    case worker_node(id) do
      ^me -> apply(module, func, args)
      node -> :rpc.call(node, module, func, args)
    end
  end

  def worker_node(id) do
    ring()
    |> HashRing.key_to_node(id)
  end

  def local?(id), do: worker_node(id) == node()

  defp ring() do
    HashRing.new()
    |> HashRing.add_nodes([node() | Node.list()])
  end
end
