defmodule ConsoleWeb.OpenAPI.CD.ServiceController do
  @moduledoc """
  OpenAPI controller for managing service deployments.

  A service deployment is a reference to a service deployed from a git repo into a cluster.
  Services represent the core deployment unit for continuous delivery in the platform.
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Services
  alias Console.Schema.Service

  plug Scope, [resource: :service, action: :read] when action in [:show, :index]
  plug Scope, [resource: :service, action: :write] when action in [:create, :update, :delete, :kick]

  @doc """
  Fetches a service deployment by id.
  """
  operation :show,
    operation_id: "GetService",
    tags: ["service"],
    "x-required-scopes": ["service.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.CD.Service]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Services.get_service!(id)
    |> Repo.preload([:errors])
    |> allow(user, :read)
    |> successful(conn, OpenAPI.CD.Service)
  end

  @doc """
  Lists service deployments with optional filtering by cluster, status, and search query.
  """
  operation :index,
    operation_id: "ListServices",
    tags: ["service"],
    "x-required-scopes": ["service.read"],
    parameters: [
      cluster_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter by cluster id"],
      status: [in: :query, schema: %{type: :string}, required: false, description: "Filter by service status (stale, synced, healthy, failed, paused)"],
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search services by name prefix"],
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.CD.Service.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    query_params = conn.private.oaskit.query_params

    Service.for_user(user)
    |> apply_filters(query_params)
    |> Service.ordered()
    |> Service.preloaded([:errors])
    |> paginate(conn, OpenAPI.CD.Service)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:cluster_id, id}, q when is_binary(id) -> Service.for_cluster(q, id)
      {:status, status}, q when is_binary(status) -> Service.for_status(q, status)
      {:q, search}, q when is_binary(search) and byte_size(search) > 0 -> Service.search(q, search)
      _, q -> q
    end)
  end

  @doc """
  Creates a new service deployment in a cluster.

  A new service will start in a stale state until the deploy operator syncs it.
  """
  operation :create,
    operation_id: "CreateService",
    tags: ["service"],
    "x-required-scopes": ["service.write"],
    parameters: [
      cluster_id: [in: :query, schema: %{type: :string}, required: true, description: "The cluster id to deploy the service into"]
    ],
    request_body: OpenAPI.CD.ServiceInput,
    responses: [ok: OpenAPI.CD.Service]
  def create(conn, _) do
    user = Console.Guardian.Plug.current_resource(conn)
    cluster_id = conn.private.oaskit.query_params[:cluster_id]

    to_attrs(conn.private.oaskit.body_params)
    |> Services.create_service(cluster_id, user)
    |> when_ok(&Repo.preload(&1, [:errors]))
    |> successful(conn, OpenAPI.CD.Service)
  end

  @doc """
  Updates an existing service deployment.

  Updates will mark the service as stale until the deploy operator syncs the changes.
  """
  operation :update,
    operation_id: "UpdateService",
    tags: ["service"],
    "x-required-scopes": ["service.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    request_body: OpenAPI.CD.ServiceInput,
    responses: [ok: OpenAPI.CD.Service]
  def update(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Services.update_service(id, user)
    |> when_ok(&Repo.preload(&1, [:errors]))
    |> successful(conn, OpenAPI.CD.Service)
  end

  @doc """
  Deletes a service deployment.

  By default, this marks the service for deletion and waits for the deploy operator
  to drain it from the cluster. Use the `detach` query parameter to immediately
  remove it from the database without waiting for the drain.
  """
  operation :delete,
    operation_id: "DeleteService",
    tags: ["service"],
    "x-required-scopes": ["service.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true],
      detach: [in: :query, schema: %{type: :boolean}, required: false, description: "If true, immediately remove the service without waiting for cluster drain"]
    ],
    responses: [ok: OpenAPI.CD.Service]
  def delete(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    case conn.private.oaskit.query_params[:detach] do
      true -> Services.detach_service(id, user)
      _ -> Services.delete_service(id, user)
    end
    |> when_ok(&Repo.preload(&1, [:errors]))
    |> successful(conn, OpenAPI.CD.Service)
  end
end
