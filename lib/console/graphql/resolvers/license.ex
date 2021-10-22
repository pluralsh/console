defmodule Console.GraphQl.Resolvers.License do
  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(_, apps) do
    query_results = fetch_licenses()
    Map.new(apps, fn app ->
      {app, query_results[app]}
    end)
  end

  def fetch_licenses() do
    case Kube.Client.list_licenses() do
      {:ok, %{items: licenses}} -> Enum.into(licenses, %{}, & {&1.metadata.name, &1})
      _ -> %{}
    end
  end
end
