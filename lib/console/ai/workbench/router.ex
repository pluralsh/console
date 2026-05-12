defmodule Console.AI.Workbench.Router do
  alias Console.Schema.WorkbenchJob
  alias Console.AI.Workbench.Heartbeat

  def stop(%WorkbenchJob{} = job), do: maybe_rpc(job, Heartbeat, :kill, [job])

  defp to_node(%WorkbenchJob{id: id}), do: Console.ClusterRing.node(id)

  defp maybe_rpc(%WorkbenchJob{} = job, module, func, args) do
    me = node()
    case to_node(job) do
      ^me -> apply(module, func, args)
      node -> :rpc.call(node, module, func, args)
    end
  end
end
