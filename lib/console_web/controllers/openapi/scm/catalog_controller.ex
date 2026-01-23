defmodule ConsoleWeb.OpenAPI.SCM.CatalogController do
  @moduledoc """
  OpenAPI controller for managing catalogs.

  A catalog is a collection of PR automations that can be used for self-service
  deployment workflows. Catalogs help organize and provide discoverability for
  available deployment templates.
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Git
  alias Console.Schema.Catalog

  plug Scope, [resource: :catalog, action: :read] when action in [:show, :index]
  plug Scope, [resource: :catalog, action: :write] when action in [:create, :update, :delete]

  @doc """
  Fetches a catalog by id.
  """
  operation :show,
    operation_id: "GetCatalog",
    tags: ["catalog"],
    "x-required-scopes": ["catalog.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.SCM.Catalog]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Git.get_catalog!(id)
    |> allow(user, :read)
    |> successful(conn, OpenAPI.SCM.Catalog)
  end

  @doc """
  Lists catalogs with optional filtering by project and search query.
  """
  operation :index,
    operation_id: "ListCatalogs",
    tags: ["catalog"],
    "x-required-scopes": ["catalog.read"],
    parameters: [
      project_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter by project id"],
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search catalogs by name"],
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.SCM.Catalog.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    query_params = conn.private.oaskit.query_params

    Catalog.for_user(user)
    |> apply_filters(query_params)
    |> Catalog.ordered()
    |> paginate(conn, OpenAPI.SCM.Catalog)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:project_id, id}, q when is_binary(id) -> Catalog.for_project(q, id)
      {:q, search}, q when is_binary(search) and byte_size(search) > 0 -> Catalog.search(q, search)
      _, q -> q
    end)
  end

  @doc """
  Creates or updates a catalog.

  If a catalog with the given name already exists, it will be updated.
  Otherwise, a new catalog will be created.
  """
  operation :create,
    operation_id: "UpsertCatalog",
    tags: ["catalog"],
    "x-required-scopes": ["catalog.write"],
    request_body: OpenAPI.SCM.CatalogInput,
    responses: [ok: OpenAPI.SCM.Catalog]
  def create(conn, _) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Git.upsert_catalog(user)
    |> successful(conn, OpenAPI.SCM.Catalog)
  end

  @doc """
  Updates an existing catalog by id.
  """
  operation :update,
    operation_id: "UpdateCatalog",
    tags: ["catalog"],
    "x-required-scopes": ["catalog.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    request_body: OpenAPI.SCM.CatalogInput,
    responses: [ok: OpenAPI.SCM.Catalog]
  def update(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    catalog = Git.get_catalog!(id)
               |> Repo.preload([:read_bindings, :write_bindings, :create_bindings])

    with {:ok, _} <- allow(catalog, user, :write) do
      attrs = to_attrs(conn.private.oaskit.body_params)
      Catalog.changeset(catalog, attrs)
      |> Repo.update()
      |> successful(conn, OpenAPI.SCM.Catalog)
    end
  end

  @doc """
  Deletes a catalog.
  """
  operation :delete,
    operation_id: "DeleteCatalog",
    tags: ["catalog"],
    "x-required-scopes": ["catalog.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.SCM.Catalog]
  def delete(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Git.delete_catalog(id, user)
    |> successful(conn, OpenAPI.SCM.Catalog)
  end
end
