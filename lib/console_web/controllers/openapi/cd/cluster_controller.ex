defmodule ConsoleWeb.OpenAPI.CD.ClusterController do
  @moduledoc """
  OpenAPI controller for managing Kubernetes clusters.

  A cluster represents a Kubernetes cluster that can be deployed to and managed through the platform.
  Clusters can be provisioned via CAPI or brought in as BYOK (Bring Your Own Kubernetes).
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Clusters
  alias Console.Schema.Cluster

  plug Scope, [resource: :cluster, action: :read] when action in [:show, :index, :upgrade_summary]
  plug Scope, [resource: :cluster, action: :write] when action in [:create, :update, :delete]

  @doc """
  Fetches a cluster by id.
  """
  operation :show,
    operation_id: "GetCluster",
    tags: ["cluster"],
    "x-required-scopes": ["cluster.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.CD.Cluster]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Clusters.get_cluster!(id)
    |> Repo.preload([:tags])
    |> allow(user, :read)
    |> successful(conn, OpenAPI.CD.Cluster)
  end

  @doc """
  Lists clusters with optional filtering.
  """
  operation :index,
    operation_id: "ListClusters",
    tags: ["cluster"],
    "x-required-scopes": ["cluster.read"],
    parameters: [
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search clusters by name or handle prefix"],
      project_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter by project id"],
      healthy: [in: :query, schema: %{type: :boolean}, required: false, description: "Filter by health status (true for healthy, false for unhealthy)"],
      tag: [in: :query, schema: %{type: :string}, required: false, description: "Filter by tag pair, using format {name}:{value}"],
      upgradeable: [in: :query, schema: %{type: :boolean}, required: false, description: "Filter by upgrade readiness"],
      compliance: [in: :query, schema: %{type: :string, enum: ["latest", "compliant", "outdated"]}, required: false, description: "Filter by version compliance status"],
      page: [in: :query, schema: %{type: :integer}, required: false, description: "Page number for pagination"],
      per_page: [in: :query, schema: %{type: :integer}, required: false, description: "Number of items per page"]
    ],
    responses: [ok: OpenAPI.CD.Cluster.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    query_params = conn.private.oaskit.query_params

    Cluster.for_user(user)
    |> apply_filters(query_params)
    |> Cluster.ordered()
    |> Cluster.preloaded([:tags])
    |> paginate(conn, OpenAPI.CD.Cluster)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:q, search}, q when is_binary(search) and byte_size(search) > 0 -> Cluster.search(q, search)
      {:project_id, id}, q when is_binary(id) -> Cluster.for_project(q, id)
      {:healthy, h}, q when is_boolean(h) -> Cluster.health(q, h)
      {:upgradeable, true}, q -> Cluster.upgradeable(q)
      {:upgradeable, false}, q -> Cluster.not_upgradeable(q)
      {:compliance, c}, q when c in ["latest", "compliant", "outdated"] ->
        Cluster.with_version_compliance(q, c)
      _, q -> q
    end)
    |> apply_tag_filter(params)
  end

  defp apply_tag_filter(query, %{tag: pair}) when is_binary(pair) do
    case String.split(pair, ":") do
      [name, value] -> Cluster.with_tag(query, name, value)
      _ -> query
    end
  end
  defp apply_tag_filter(query, _), do: query

  @doc """
  Creates a new cluster.
  """
  operation :create,
    operation_id: "CreateCluster",
    tags: ["cluster"],
    "x-required-scopes": ["cluster.write"],
    request_body: OpenAPI.CD.ClusterInput,
    responses: [ok: OpenAPI.CD.Cluster]
  def create(conn, _) do
    user = Console.Guardian.Plug.current_resource(conn)
    to_attrs(conn.private.oaskit.body_params)
    |> Clusters.create_cluster(user)
    |> when_ok(&Repo.preload(&1, [:tags]))
    |> successful(conn, OpenAPI.CD.Cluster)
  end

  @doc """
  Updates an existing cluster's configuration.
  """
  operation :update,
    operation_id: "UpdateCluster",
    tags: ["cluster"],
    "x-required-scopes": ["cluster.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The cluster id"]
    ],
    request_body: OpenAPI.CD.ClusterInput,
    responses: [ok: OpenAPI.CD.Cluster]
  def update(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Clusters.update_cluster(id, user)
    |> when_ok(&Repo.preload(&1, [:tags]))
    |> successful(conn, OpenAPI.CD.Cluster)
  end

  @doc """
  Deletes or detaches a cluster.

  By default, marks the cluster for deletion and waits for the deploy operator to drain it.
  Use the `detach` query parameter to immediately remove it from the database without draining.
  """
  operation :delete,
    operation_id: "DeleteCluster",
    tags: ["cluster"],
    "x-required-scopes": ["cluster.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The cluster id"],
      detach: [in: :query, schema: %{type: :boolean}, required: false, description: "If true, immediately remove the cluster without waiting for drain"]
    ],
    responses: [ok: OpenAPI.CD.Cluster]
  def delete(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    case conn.private.oaskit.query_params[:detach] do
      true -> Clusters.detach_cluster(id, user)
      _ -> Clusters.delete_cluster(id, user)
    end
    |> when_ok(&Repo.preload(&1, [:tags]))
    |> successful(conn, OpenAPI.CD.Cluster)
  end

  @doc """
  Returns the upgrade summary for a cluster.

  This provides a consolidated view of all changes needed to upgrade a cluster, including
  failed upgrade insights and blocking addons (both runtime and cloud-managed) that need
  to be updated before the Kubernetes version can be upgraded.
  """
  operation :upgrade_summary,
    operation_id: "GetClusterUpgradeSummary",
    tags: ["cluster"],
    "x-required-scopes": ["cluster.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The cluster id"]
    ],
    responses: [ok: OpenAPI.CD.ClusterUpgradeSummary]
  def upgrade_summary(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    with {:ok, cluster} <- Clusters.get_cluster!(id) |> allow(user, :read) do
      summary = Clusters.upgrade_plan(cluster)

      # Transform the summary to match the OpenAPI schema format
      result = %{
        failed_insights: preload_insight_details(summary.failed_insights),
        blocking_addons: Enum.map(summary.blocking_addons, &transform_runtime_addon/1),
        blocking_cloud_addons: Enum.map(summary.blocking_cloud_addons, &transform_cloud_addon/1)
      }

      successful(result, conn, OpenAPI.CD.ClusterUpgradeSummary)
    end
  end

  defp preload_insight_details(insights) do
    Repo.preload(insights, [:details])
  end

  defp transform_runtime_addon(%{current: current, addon: addon} = upgrade) do
    %{
      addon: addon && %{
        name: addon.name,
        icon: addon.icon,
        git_url: addon.git_url,
        release_url: addon.release_url
      },
      current: current && %{
        version: current.version,
        kube: current.kube,
        chart_version: current.chart_version,
        release_url: current[:release_url]
      },
      fix: upgrade[:fix] && %{
        version: upgrade.fix.version,
        kube: upgrade.fix.kube,
        chart_version: upgrade.fix.chart_version,
        release_url: upgrade.fix[:release_url]
      },
      callout: upgrade[:callout]
    }
  end

  defp transform_cloud_addon(%{current: current, addon: addon} = upgrade) do
    %{
      addon: addon && %{
        id: addon.id,
        distro: addon.distro,
        name: addon.name,
        version: addon.version,
        inserted_at: addon.inserted_at,
        updated_at: addon.updated_at
      },
      current: current && %{
        version: current.version,
        compatibilities: current.compatibilities
      },
      fix: upgrade[:fix] && %{
        version: upgrade.fix.version,
        compatibilities: upgrade.fix.compatibilities
      },
      callout: upgrade[:callout]
    }
  end
end
