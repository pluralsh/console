defmodule ConsoleWeb.CostController do
  @moduledoc """
  Bulk uploads of a cluster's cost data from the deployment operator, replacing its namespace usage and
  scaling recommendations like the `ingestClusterCost` mutation.
  """
  use ConsoleWeb, :controller
  import ConsoleWeb.Params, only: [permit: 2, cast_all: 3]
  alias Console.Cost.Ingester
  alias Console.Schema.{ClusterNamespaceUsage, ClusterScalingRecommendation}
  alias ConsoleWeb.Plugs.Token

  action_fallback ConsoleWeb.FallbackController

  @cost ~w(
    namespace memory cpu gpu storage memory_util cpu_util gpu_util cpu_cost memory_cost gpu_cost
    ingress_cost load_balancer_cost egress_cost node_cost control_plane_cost storage_cost
  )a

  @recommendation ~w(
    type namespace name container cpu_util gpu_util memory_util memory_request cpu_request
    cpu_cost memory_cost gpu_cost service_id
  )a

  @doc """
  Ingests cluster costs, posted as `{"cluster": {...}, "namespaces": [...], "recommendations": [...]}`.

  Namespace usage and recommendations are batch inserted without changesets, so they're cast to their
  schemas' types here.
  """
  def ingest(conn, %{} = params) do
    with {:ok, cluster} <- Token.fetch_cluster(conn),
         {:ok, namespaces} <- cast_all(params["namespaces"], ClusterNamespaceUsage, @cost),
         {:ok, recommendations} <- cast_all(params["recommendations"], ClusterScalingRecommendation, @recommendation),
         {:ok, _} <- Ingester.ingest(%{
           cluster: permit(params["cluster"], @cost),
           namespaces: namespaces,
           recommendations: recommendations
         }, cluster),
      do: json(conn, %{ingested: true})
  end
end
