defmodule ConsoleWeb.OpenAPI.CD.ClusterController do
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Clusters
  alias Console.Schema.Cluster

  operation :show,
    operation_id: "GetCluster",
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

  operation :index,
    operation_id: "ListClusters",
    parameters: [
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.CD.Cluster.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    Cluster.for_user(user)
    |> Cluster.ordered()
    |> Cluster.preloaded([:tags])
    |> paginate(conn, OpenAPI.CD.Cluster)
  end

  operation :create,
    operation_id: "CreateCluster",
    request_body: OpenAPI.CD.ClusterInput,
    responses: [ok: OpenAPI.CD.Cluster]
  def create(conn, _) do
    user = Console.Guardian.Plug.current_resource(conn)
    Map.from_struct(conn.private.oaskit.body_params)
    |> Clusters.create_cluster(user)
    |> when_ok(&Repo.preload(&1, [:tags]))
    |> successful(conn, OpenAPI.CD.Cluster)
  end

  operation :update,
    operation_id: "UpdateCluster",
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    request_body: OpenAPI.CD.ClusterInput,
    responses: [ok: OpenAPI.CD.Cluster]
  def update(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Map.from_struct(conn.private.oaskit.body_params)
    |> Clusters.update_cluster(id, user)
    |> when_ok(&Repo.preload(&1, [:tags]))
    |> successful(conn, OpenAPI.CD.Cluster)
  end

  operation :delete,
    operation_id: "DeleteCluster",
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true],
      detach: [in: :query, schema: %{type: :boolean}, required: false]
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
end
