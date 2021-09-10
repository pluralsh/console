defmodule Console.GraphQl.Resolvers.Kubecost do
  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(_, apps) do
    query_results = find_cost_data()
    Map.new(IO.inspect(apps), fn app ->
      {app, query_results[app]}
    end)
  end

  def find_cost_data() do
    case Kubecost.Client.get_aggregated_cost() do
      {:ok, result} -> result
      _ -> %{}
    end
  end
end
