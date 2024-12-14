# defmodule Console.Cost.Loader do
#   import Console.Cost.Utils
#   import Console.Services.Base, only: [timestamped: 1]
#   alias Console.{LocalRepo, Repo}
#   alias Console.Cost.{Extract, Queries}
#   alias Console.Schema.{Cluster, ClusterNamespaceUsage, ClusterUsage, ClusterScalingRecommendation, DeploymentSettings}
#   alias Console.Local.{
#     PodCpu,
#     PodMemory,
#     PodCpuRequest,
#     PodMemoryRequest,
#     PodMemoryMax,
#     PodOwnership
#   }
#   require Logger

#   @tables [
#     PodCpu,
#     PodMemory,
#     PodCpuRequest,
#     PodMemoryRequest,
#     PodMemoryMax,
#     PodOwnership
#   ]

#   def load() do
#     Logger.info "beginning to compile cost info"

#     if_enabled(Console.Deployments.Settings.cached(), fn settings ->
#       Cluster.ordered(Cluster, asc: :id)
#       |> Repo.stream(method: :keyset)
#       |> Stream.chunk_every(20) # only process 20 at a time to cap disk util
#       |> Stream.map(fn chunk ->
#         wipe()
#         Enum.each(chunk, &Extract.extract(&1, settings)) # load all needed data into sqlite
#         clusters = Map.new(chunk, & {&1.handle, &1})
#         Enum.each(~w(cluster namespace rec)a, &do_load(&1, clusters)) # query sqlite and persit to postgres
#       end)
#       |> Stream.run()

#       wipe()
#     end)
#     |> log()
#   end

#   defp do_load(:cluster, clusters) do
#     Queries.cluster_aggregate()
#     |> LocalRepo.all()
#     |> Stream.map(&convert(&1, clusters))
#     |> Stream.filter(& &1)
#     |> batch_insert(
#       ClusterUsage,
#       repo: Console.Repo,
#       conflict_target: :cluster_id,
#       on_conflict: {:replace_all_except, [:id]}
#     )
#   end

#   defp do_load(:namespace, clusters) do
#     Queries.namespace_aggregate()
#     |> LocalRepo.all()
#     |> Stream.map(&convert(&1, clusters))
#     |> Stream.filter(& &1)
#     |> batch_insert(
#       ClusterNamespaceUsage,
#       repo: Console.Repo,
#       conflict_target: [:cluster_id, :namespace],
#       on_conflict: {:replace_all_except, [:id]}
#     )
#   end

#   defp do_load(:rec, clusters) do
#     settings = Console.Deployments.Settings.cached()
#     Queries.recommendations(threshold(settings), cushion(settings))
#     |> LocalRepo.all()
#     |> Stream.map(&convert(&1, clusters))
#     |> Stream.filter(& &1)
#     |> batch_insert(
#       ClusterScalingRecommendation,
#       repo: Console.Repo,
#       conflict_target: [:cluster_id, :type, :namespace, :name, :container],
#       on_conflict: {:replace_all_except, [:id]}
#     )
#   end

#   defp convert(%{cluster: c} = result, clusters) do
#     case clusters do
#       %{^c => %Cluster{id: id}} ->
#         Map.put(result, :cluster_id, id)
#         |> Map.delete(:cluster)
#         |> timestamped()
#       _ -> nil
#     end
#   end

#   defp wipe(), do: Enum.each(@tables, & LocalRepo.delete_all(&1))

#   defp threshold(%DeploymentSettings{cost: %DeploymentSettings.Cost{recommendation_threshold: t}}) when is_integer(t),
#     do: t
#   defp threshold(_), do: 30

#   defp cushion(%DeploymentSettings{cost: %DeploymentSettings.Cost{recommendation_cushion: t}}) when is_integer(t),
#     do: t
#   defp cushion(_), do: 20

#   defp log(result), do: Logger.info "finished compiling cost data: #{inspect(result)}"
# end
