defmodule Console.Cost.Ingester do
  import Console.Services.Base
  import Console.Cost.Utils, only: [batch_insert: 2]
  alias Console.Repo
  alias Console.Deployments.Settings
  alias Console.Schema.{DeploymentSettings, Cluster, ClusterUsage, ClusterNamespaceUsage, ClusterScalingRecommendation}
  require Logger

  def ingest(attrs, %Cluster{id: id, handle: handle}) do
    settings = Settings.cached()
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
      recs = Map.get(attrs, :recommendations) || []
      Logger.info "Found #{length(recs)} recommendations for #{handle}"
      IO.inspect(recs)

      recs
      |> Stream.map(&cluster_timestamped(&1, id))
      |> Stream.map(&infer_recommendation(&1, cushion(settings)))
      |> Stream.map(&filter_threshold(&1, settings))
      |> Stream.filter(& &1)
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

  defp cushion(%DeploymentSettings{cost: %DeploymentSettings.Cost{recommendation_cushion: cush}}), do: cush
  defp cushion(_), do: 30

  defp infer_recommendation(map, cush) when is_integer(cush) do
    case map do
      %{memory_util: mr, cpu_util: cr} = map when is_float(mr) or is_float(cr) ->
        Map.merge(map, %{memory_recommendation: cushioned(mr, cush), cpu_recommendation: cushioned(cr, cush)})
      _ -> nil
    end
  end
  defp infer_recommendation(_, _), do: nil

  defp filter_threshold(%{} = map, %DeploymentSettings{cost: %DeploymentSettings.Cost{recommendation_threshold: threshold}})
    when is_integer(threshold) do
    Map.take(map, ~w(cpu_cost memory_cost)a)
    |> Enum.reduce(0.0, fn {_, v}, sum -> sum + safe(v) end)
    |> case do
      cost when cost > threshold -> map
      _ -> nil
    end
  end
  defp filter_threshold(m, _), do: m

  defp cushioned(nil, _), do: nil
  defp cushioned(val, cushion), do: val * ((cushion + 100) / 100)

  defp safe(nil), do: 0
  defp safe(v), do: v
end
