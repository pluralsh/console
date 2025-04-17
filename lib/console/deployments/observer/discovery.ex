defmodule Console.Deployments.Observer.Discovery do
  alias Console.Deployments.Observer.Supervisor
  alias Console.Schema.Observer

  def runner(%Observer{} = observer),
    do: maybe_rpc(observer.id, Supervisor, :start_child, [observer])

  defp maybe_rpc(id, module, func, args) do
    me = node()
    case worker_node(id) do
      ^me -> apply(module, func, args)
      node -> :rpc.call(node, module, func, args)
    end
  end

  def worker_node(id), do: HashRing.Managed.key_to_node(:cluster, id)

  def local?(id), do: worker_node(id) == node()
end
