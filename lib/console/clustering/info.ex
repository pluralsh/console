defmodule Console.Clustering.Info do
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Kube.Resource

  def fetch() do
    with {:ok, %{items: nodes}} <- all_nodes(),
         summary when is_map(summary) <- summarize(nodes),
      do: {:ok, summary}
  end

  defp all_nodes() do
    CoreV1.list_node!()
    |> Kazan.run()
  end

  defp summarize(nodes) do
    Enum.reduce_while(nodes, %{cpu: 0, memory: 0}, fn
      %CoreV1.Node{status: %CoreV1.NodeStatus{capacity: %{"cpu" => cpu, "memory" => memory}}}, summary ->
        case add_usage(summary, cpu, memory) do
          {:error, _} = err -> {:halt, err}
          summary -> {:cont, summary}
        end
      _, summary -> {:cont, summary}
    end)
  end

  defp add_usage(%{cpu: ccpu, memory: cmem} = summary, cpu, memory) do
    with {:ok, cpu} <- Resource.cpu(cpu),
         {:ok, memory} <- Resource.memory(memory) do
      %{summary | cpu: cpu + ccpu, memory: memory + cmem}
    else
      err -> err
    end
  end
end
