defmodule ConsoleWeb.OpenAPI.CD.GlobalServiceController do
  @moduledoc """
  OpenAPI controller for managing global services.

  A global service allows deploying a service template or an existing service across
  multiple clusters based on provider, distro, or tag matching criteria.
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Global
  alias Console.Schema.GlobalService

  plug Scope, [resource: :global, action: :read] when action in [:show, :index]
  plug Scope, [resource: :global, action: :write] when action in [:create, :update, :delete, :sync]

  @doc """
  Fetches a global service by id.
  """
  operation :show,
    operation_id: "GetGlobalService",
    tags: ["global"],
    "x-required-scopes": ["global.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.CD.GlobalService]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Global.get!(id)
    |> Repo.preload([template: :dependencies])
    |> allow(user, :read)
    |> successful(conn, OpenAPI.CD.GlobalService)
  end

  @doc """
  Lists global services with optional filtering by project and search query.
  """
  operation :index,
    operation_id: "ListGlobalServices",
    tags: ["global"],
    "x-required-scopes": ["global.read"],
    parameters: [
      project_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter by project id"],
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search global services by name"],
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.CD.GlobalService.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    query_params = conn.private.oaskit.query_params

    GlobalService.for_user(user)
    |> apply_filters(query_params)
    |> GlobalService.ordered()
    |> GlobalService.preloaded([template: :dependencies])
    |> paginate(conn, OpenAPI.CD.GlobalService)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:project_id, id}, q when is_binary(id) -> GlobalService.for_project(q, id)
      {:q, search}, q when is_binary(search) and byte_size(search) > 0 -> GlobalService.search(q, search)
      _, q -> q
    end)
  end

  @doc """
  Creates a new global service.

  A global service can either clone an existing service or use a service template.
  Services will be created in clusters matching the specified provider, distro, or tags.
  """
  operation :create,
    operation_id: "CreateGlobalService",
    tags: ["global"],
    "x-required-scopes": ["global.write"],
    parameters: [
      service_id: [in: :query, schema: %{type: :string}, required: false, description: "The source service id to clone (mutually exclusive with template)"]
    ],
    request_body: OpenAPI.CD.GlobalServiceInput,
    responses: [ok: OpenAPI.CD.GlobalService]
  def create(conn, _) do
    user = Console.Guardian.Plug.current_resource(conn)
    service_id = conn.private.oaskit.query_params[:service_id]

    to_attrs(conn.private.oaskit.body_params)
    |> Global.create(service_id, user)
    |> when_ok(&Repo.preload(&1, [template: :dependencies]))
    |> successful(conn, OpenAPI.CD.GlobalService)
  end

  @doc """
  Updates an existing global service.

  Updates will trigger a resync of the global service to all matching clusters.
  """
  operation :update,
    operation_id: "UpdateGlobalService",
    tags: ["global"],
    "x-required-scopes": ["global.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    request_body: OpenAPI.CD.GlobalServiceInput,
    responses: [ok: OpenAPI.CD.GlobalService]
  def update(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Global.update(id, user)
    |> when_ok(&Repo.preload(&1, [template: :dependencies]))
    |> successful(conn, OpenAPI.CD.GlobalService)
  end

  @doc """
  Deletes a global service.

  The cascade behavior is determined by the global service's cascade settings:
  - If cascade.delete is true, all owned services will be marked for deletion
  - If cascade.detach is true, all owned services will be immediately removed
  - Otherwise, owned services will be unlinked but preserved
  """
  operation :delete,
    operation_id: "DeleteGlobalService",
    tags: ["global"],
    "x-required-scopes": ["global.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.CD.GlobalService]
  def delete(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Global.delete(id, user)
    |> when_ok(&Repo.preload(&1, [template: :dependencies]))
    |> successful(conn, OpenAPI.CD.GlobalService)
  end

  @doc """
  Force syncs a global service to all matching clusters.

  This will immediately trigger a sync of the global service to any target clusters.
  """
  operation :sync,
    operation_id: "SyncGlobalService",
    tags: ["global"],
    "x-required-scopes": ["global.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.CD.GlobalService]
  def sync(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Global.get!(id)
    |> Repo.preload([template: :dependencies])
    |> Global.sync(user)
    |> successful(conn, OpenAPI.CD.GlobalService)
  end
end
