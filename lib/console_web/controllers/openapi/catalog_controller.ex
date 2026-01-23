defmodule ConsoleWeb.OpenAPI.CatalogController do
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Git
  alias Console.Schema.{Catalog, PrAutomation}

  plug Scope, [resource: :catalog, action: :read] when action in [:show, :index, :pr_automations]

  @doc """
  Gets a catalog by id or name.
  """
  operation :show,
    operation_id: "GetCatalog",
    tags: ["catalogs"],
    "x-required-scopes": ["catalog.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.Catalog]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    id
    |> fetch_catalog()
    |> allow(user, :read)
    |> successful(conn, OpenAPI.Catalog)
  end

  @doc """
  Lists catalogs scoped to a project.
  """
  operation :index,
    operation_id: "ListCatalogs",
    tags: ["catalogs"],
    "x-required-scopes": ["catalog.read"],
    parameters: [
      project_id: [in: :query, schema: %{type: :string, format: :uuid}, required: true],
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.Catalog.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    project_id = conn.private.oaskit.query_params[:project_id]

    Catalog.for_user(user)
    |> Catalog.for_project(project_id)
    |> Catalog.ordered()
    |> paginate(conn, OpenAPI.Catalog)
  end

  @doc """
  Lists PR automations for a catalog.
  """
  operation :pr_automations,
    operation_id: "ListCatalogPrAutomations",
    tags: ["catalogs"],
    "x-required-scopes": ["catalog.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true],
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.PrAutomation.List]
  def pr_automations(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    catalog = fetch_catalog(id)

    with {:ok, %Catalog{id: catalog_id}} <- allow(catalog, user, :read) do
      PrAutomation.for_catalog(catalog_id)
      |> PrAutomation.ordered()
      |> paginate(conn, OpenAPI.PrAutomation)
    end
  end

  defp fetch_catalog(id) do
    case Ecto.UUID.cast(id) do
      {:ok, uuid} ->
        case Repo.get(Catalog, uuid) do
          %Catalog{} = catalog -> catalog
          nil -> Git.get_catalog_by_name!(id)
        end

      :error ->
        Git.get_catalog_by_name!(id)
    end
  end
end
