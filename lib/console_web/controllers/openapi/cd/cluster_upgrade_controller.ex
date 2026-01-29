defmodule ConsoleWeb.OpenAPI.CD.ClusterUpgradeController do
  @moduledoc """
  OpenAPI controller for managing cluster upgrades.

  Cluster upgrades are agentic workflows that upgrade a cluster to the next Kubernetes version.
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Clusters
  alias Console.Schema.ClusterUpgrade

  plug Scope, [resource: :cluster, action: :read] when action in [:show]
  plug Scope, [resource: :cluster, action: :write] when action in [:create]

  @doc """
  Fetches a cluster upgrade by id.
  """
  operation :show,
    operation_id: "GetClusterUpgrade",
    tags: ["cluster-upgrade"],
    "x-required-scopes": ["cluster.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The cluster upgrade id"]
    ],
    responses: [ok: OpenAPI.CD.ClusterUpgrade]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    ClusterUpgrade
    |> Repo.get!(id)
    |> Repo.preload([:cluster, :runtime, :user, steps: [:agent_run]])
    |> allow(user, :read)
    |> successful(conn, OpenAPI.CD.ClusterUpgrade)
  end

  @doc """
  Creates a new cluster upgrade for a given cluster.
  """
  operation :create,
    operation_id: "CreateClusterUpgrade",
    tags: ["cluster-upgrade"],
    "x-required-scopes": ["cluster.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The cluster id to upgrade"]
    ],
    request_body: OpenAPI.CD.ClusterUpgradeInput,
    responses: [ok: OpenAPI.CD.ClusterUpgrade]
  def create(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Clusters.create_cluster_upgrade(id, user)
    |> when_ok(&Repo.preload(&1, [:runtime, :user, steps: [:agent_run]]))
    |> successful(conn, OpenAPI.CD.ClusterUpgrade)
  end
end
