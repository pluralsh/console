defmodule ConsoleWeb.OpenAPI.ProjectController do
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Settings
  alias Console.Schema.Project

  plug Scope, [resource: :projects, action: :read] when action in [:show, :index]

  @doc """
  Gets a project by id
  """
  operation :show,
    operation_id: "GetProject",
    summary: "Get a project by ID",
    description: "Retrieves a single project by its unique identifier",
    tags: ["projects"],
    "x-required-scopes": ["projects.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string, format: :uuid}, required: true, description: "The unique identifier of the project"]
    ],
    responses: [ok: OpenAPI.Project]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Settings.get_project!(id)
    |> allow(user, :read)
    |> successful(conn, OpenAPI.Project)
  end

  @doc """
  Lists all projects the user has access to
  """
  operation :index,
    operation_id: "ListProjects",
    summary: "List all projects",
    description: "Returns a paginated list of all projects the authenticated user has access to",
    tags: ["projects"],
    "x-required-scopes": ["projects.read"],
    parameters: [
      page: [in: :query, schema: %{type: :integer}, required: false, description: "The page number for pagination"],
      per_page: [in: :query, schema: %{type: :integer}, required: false, description: "The number of items per page"]
    ],
    responses: [ok: OpenAPI.Project.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    Project.for_user(user)
    |> Project.ordered()
    |> paginate(conn, OpenAPI.Project)
  end
end
