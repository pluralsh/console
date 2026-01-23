defmodule ConsoleWeb.OpenAPI.SCM.PrAutomationController do
  @moduledoc """
  OpenAPI controller for managing PR automations.

  A PR automation defines templates and rules for automatically creating pull requests
  that modify infrastructure or application configurations. PR automations can be
  organized into catalogs for discoverability.
  """
  use ConsoleWeb, :api_controller
  alias Console.Deployments.Git
  alias Console.Schema.PrAutomation

  plug Scope, [resource: :catalog, action: :read] when action in [:show, :index, :index_for_catalog]
  plug Scope, [resource: :catalog, action: :write] when action in [:invoke]

  @doc """
  Fetches a PR automation by id.
  """
  operation :show,
    operation_id: "GetPrAutomation",
    tags: ["prautomation"],
    "x-required-scopes": ["catalog.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.SCM.PrAutomation]
  def show(conn, %{"id" => id}) do
    Git.get_pr_automation!(id)
    |> Repo.preload([:configuration])
    |> successful(conn, OpenAPI.SCM.PrAutomation)
  end

  @doc """
  Lists PR automations with optional filtering by project, catalog, and search query.
  """
  operation :index,
    operation_id: "ListPrAutomations",
    tags: ["prautomation"],
    "x-required-scopes": ["catalog.read"],
    parameters: [
      project_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter by project id"],
      catalog_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter by catalog id"],
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search PR automations by name"],
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.SCM.PrAutomation.List]
  def index(conn, _params) do
    query_params = conn.private.oaskit.query_params

    PrAutomation
    |> apply_filters(query_params)
    |> PrAutomation.ordered()
    |> Repo.preload([:configuration])
    |> paginate(conn, OpenAPI.SCM.PrAutomation)
  end

  @doc """
  Lists PR automations for a specific catalog.
  """
  operation :index_for_catalog,
    operation_id: "ListPrAutomationsForCatalog",
    tags: ["prautomation"],
    "x-required-scopes": ["catalog.read"],
    parameters: [
      catalog_id: [in: :path, schema: %{type: :string}, required: true, description: "The catalog id to list PR automations for"],
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search PR automations by name"],
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.SCM.PrAutomation.List]
  def index_for_catalog(conn, %{"catalog_id" => catalog_id}) do
    query_params = conn.private.oaskit.query_params

    PrAutomation.for_catalog(catalog_id)
    |> apply_filters(query_params)
    |> PrAutomation.ordered()
    |> Repo.preload([:configuration])
    |> paginate(conn, OpenAPI.SCM.PrAutomation)
  end

  @doc """
  Invokes a PR automation to create a pull request.

  This executes the PR automation template with the provided context to create
  a new pull request in the configured repository.
  """
  operation :invoke,
    operation_id: "InvokePrAutomation",
    tags: ["prautomation"],
    "x-required-scopes": ["catalog.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The PR automation id to invoke"]
    ],
    request_body: OpenAPI.SCM.CreatePullRequestInput,
    responses: [ok: OpenAPI.SCM.PullRequest]
  def invoke(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    body_params = conn.private.oaskit.body_params

    branch = body_params[:branch]
    identifier = body_params[:identifier]
    context = body_params[:context] || %{}

    Git.create_pull_request(%{}, context, id, branch, identifier, user)
    |> successful(conn, OpenAPI.SCM.PullRequest)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:project_id, id}, q when is_binary(id) -> PrAutomation.for_project(q, id)
      {:catalog_id, id}, q when is_binary(id) -> PrAutomation.for_catalog(q, id)
      {:q, search}, q when is_binary(search) and byte_size(search) > 0 -> PrAutomation.search(q, search)
      _, q -> q
    end)
  end
end
