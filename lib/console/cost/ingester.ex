defmodule Console.Cost.Ingester do
  alias Console.Repo
  import Console.Services.Base
  import Console.Cost.Utils, only: [batch_insert: 2]
  alias Console.Schema.{Cluster, ClusterUsage, ClusterNamespaceUsage, ClusterScalingRecommendation}

  def ingest(attrs, %Cluster{id: id}) do
    start_transaction()
    |> add_operation(:cluster, fn _ ->
      case Repo.get_by(ClusterUsage, cluster_id: id) do
        %ClusterUsage{} = usage -> usage
        nil -> %ClusterUsage{cluster_id: id}
      end
      |> ClusterUsage.changeset(attrs[:cluster])
      |> Repo.insert_or_update()
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
    |> add_operation(:namespace, fn _ ->
      (Map.get(attrs, :namespaces) || [])
      |> Stream.map(&cluster_timestamped(&1, id))
      |> Stream.map(&Map.drop(&1, ~w(gpu_util node_cost control_plane_cost)a))
      |> batch_insert(ClusterNamespaceUsage)
      |> ok()
    end)
    |> add_operation(:scaling, fn _ ->
      (Map.get(attrs, :recommendations) || [])
      |> Stream.map(&cluster_timestamped(&1, id))
      |> batch_insert(ClusterScalingRecommendation)
      |> ok()
    end)
    |> execute()
    |> case do
      {:ok, _} -> {:ok, true}
      err -> err
    end
  end

  defp cluster_timestamped(map, cluster_id) do
    timestamped(map)
    |> Map.put(:cluster_id, cluster_id)
  end
end
