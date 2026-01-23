defmodule ConsoleWeb.OpenAPI.SCM.PullRequestController do
  @moduledoc """
  OpenAPI controller for listing pull requests.

  Pull requests are references to PRs created through PR automations or tracked
  for deployment workflows. They can be associated with services, clusters, stacks, or flows.
  """
  use ConsoleWeb, :api_controller
  alias Console.Schema.PullRequest

  plug Scope, [resource: :catalog, action: :read] when action in [:show, :index]

  @doc """
  Fetches a pull request by id.
  """
  operation :show,
    operation_id: "GetPullRequest",
    tags: ["pullrequest"],
    "x-required-scopes": ["catalog.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.SCM.PullRequest]
  def show(conn, %{"id" => id}) do
    Repo.get!(PullRequest, id)
    |> successful(conn, OpenAPI.SCM.PullRequest)
  end

  @doc """
  Lists pull requests with optional filtering by cluster, service, stack, status, and search query.
  """
  operation :index,
    operation_id: "ListPullRequests",
    tags: ["pullrequest"],
    "x-required-scopes": ["catalog.read"],
    parameters: [
      cluster_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter by cluster id"],
      service_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter by service id"],
      stack_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter by stack id"],
      open: [in: :query, schema: %{type: :boolean}, required: false, description: "Filter to only open pull requests"],
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search pull requests by title"],
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.SCM.PullRequest.List]
  def index(conn, _params) do
    query_params = conn.private.oaskit.query_params

    PullRequest
    |> apply_filters(query_params)
    |> PullRequest.ordered()
    |> paginate(conn, OpenAPI.SCM.PullRequest)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:cluster_id, id}, q when is_binary(id) -> PullRequest.for_cluster(q, id)
      {:service_id, id}, q when is_binary(id) -> PullRequest.for_service(q, id)
      {:stack_id, id}, q when is_binary(id) -> PullRequest.for_stack(q, id)
      {:open, true}, q -> PullRequest.open(q)
      {:q, search}, q when is_binary(search) and byte_size(search) > 0 -> PullRequest.search(q, search)
      _, q -> q
    end)
  end
end
