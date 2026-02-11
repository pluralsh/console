defmodule ConsoleWeb.OpenAPI.AI.WorkbenchController do
  @moduledoc """
  OpenAPI controller for workbenches.

  A workbench is a configured environment for running AI jobs with system prompts,
  tools, and optional coding/infrastructure capabilities.
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Workbenches
  alias Console.Schema.Workbench

  plug Scope, [resource: :ai, action: :read] when action in [:show, :show_by_name, :index]

  @doc """
  Fetches a workbench by id.
  """
  operation :show,
    operation_id: "GetWorkbench",
    tags: ["workbench"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the workbench"]
    ],
    responses: [ok: OpenAPI.AI.Workbench]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Workbenches.get_workbench!(id)
    |> allow(user, :read)
    |> successful(conn, OpenAPI.AI.Workbench)
  end

  @doc """
  Fetches a workbench by name.
  """
  operation :show_by_name,
    operation_id: "GetWorkbenchByName",
    tags: ["workbench"],
    "x-required-scopes": ["workbench.read"],
    parameters: [
      name: [in: :query, schema: %{type: :string}, required: true, description: "The name of the workbench"]
    ],
    responses: [ok: OpenAPI.AI.Workbench]
  def show_by_name(conn, %{"name" => name}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Workbenches.get_workbench_by_name!(name)
    |> allow(user, :read)
    |> successful(conn, OpenAPI.AI.Workbench)
  end

  @doc """
  Lists workbenches with optional filtering by project and search query.
  """
  operation :index,
    operation_id: "ListWorkbenches",
    tags: ["workbench"],
    "x-required-scopes": ["workbench.read"],
    parameters: [
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search workbenches by name"],
      project_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter by project id"],
      page: [in: :query, schema: %{type: :integer}, required: false, description: "Page number for pagination"],
      per_page: [in: :query, schema: %{type: :integer}, required: false, description: "Number of items per page"]
    ],
    responses: [ok: OpenAPI.AI.Workbench.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    query_params = conn.private.oaskit.query_params

    Workbench.ordered()
    |> Workbench.for_user(user)
    |> apply_filters(query_params)
    |> paginate(conn, OpenAPI.AI.Workbench)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:q, search}, q when is_binary(search) and byte_size(search) > 0 ->
        Workbench.search(q, search)
      {:project_id, project_id}, q when is_binary(project_id) ->
        Workbench.for_project(q, project_id)
      _, q ->
        q
    end)
  end
end
