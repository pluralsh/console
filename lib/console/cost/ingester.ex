defmodule Console.Cost.Ingester do
  alias Console.Repo
  import Console.Services.Base
  import Console.Cost.Utils, only: [batch_insert: 3]
  alias Console.Schema.{Cluster, ClusterUsage, ClusterNamespaceUsage, ClusterScalingRecommendation}

  def ingest(attrs, %Cluster{id: id}) do
    start_transaction()
    |> add_operation(:wipe_cluster, fn _ ->
      ClusterUsage.for_cluster(id)
      |> Repo.delete_all()
      |> ok()
    end)
    |> add_operation(:wipe_namespace, fn _ ->
      ClusterNamespaceUsage.for_cluster(id)
      |> Repo.delete_all()
      |> ok()
    end)
    |> add_operation(:wipe_recs, fn _ ->
      ClusterScalingRecommendation.for_cluster(id)
      |> Repo.delete_all()
      |> ok()
    end)
    |> add_operation(:cluster, fn _ ->
      %ClusterUsage{id: id}
      |> ClusterUsage.changeset(attrs[:cluster])
      |> Repo.insert()
    end)
    |> add_operation(:namespace, fn _ ->
      Map.get(attrs, :namespaces, [])
      |> Stream.map(&timestamped/1)
      |> Stream.map(&Map.drop(&1, ~w(gpu_util)a))
      |> batch_insert(ClusterNamespaceUsage, repo: Repo)
      |> ok()
    end)
    |> add_operation(:scaling, fn _ ->
      Map.get(attrs, :recommendations, [])
      |> Stream.map(&timestamped/1)
      |> batch_insert(ClusterScalingRecommendation, repo: Repo)
      |> ok()
    end)
    |> execute()
    |> case do
      {:ok, _} -> {:ok, true}
      err -> err
    end
  end
end
