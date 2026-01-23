defmodule ConsoleWeb.OpenAPI.AI.SentinelController do
  @moduledoc """
  OpenAPI controller for managing sentinels.

  A sentinel is an automated monitoring and testing system that runs checks against
  your infrastructure. Sentinels can perform log analysis, Kubernetes resource checks,
  and integration tests across clusters.
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Sentinels
  alias Console.Schema.Sentinel

  plug Scope, [resource: :ai, action: :read] when action in [:show, :index]
  plug Scope, [resource: :ai, action: :write] when action in [:trigger]

  @doc """
  Fetches a sentinel by id.
  """
  operation :show,
    operation_id: "GetSentinel",
    tags: ["sentinel"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the sentinel"]
    ],
    responses: [ok: OpenAPI.AI.Sentinel]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Sentinels.get_sentinel!(id)
    |> allow(user, :read)
    |> successful(conn, OpenAPI.AI.Sentinel)
  end

  @doc """
  Lists sentinels with optional filtering by status and search query.
  """
  operation :index,
    operation_id: "ListSentinels",
    tags: ["sentinel"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      status: [in: :query, schema: %{type: :string, enum: [:pending, :success, :failed]}, required: false, description: "Filter by sentinel status"],
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search sentinels by name"],
      page: [in: :query, schema: %{type: :integer}, required: false, description: "Page number for pagination"],
      per_page: [in: :query, schema: %{type: :integer}, required: false, description: "Number of items per page"]
    ],
    responses: [ok: OpenAPI.AI.Sentinel.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    query_params = conn.private.oaskit.query_params

    Sentinel.ordered()
    |> Sentinel.for_user(user)
    |> apply_filters(query_params)
    |> paginate(conn, OpenAPI.AI.Sentinel)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:status, status}, q when is_binary(status) ->
        Sentinel.for_status(q, status)
      {:q, search}, q when is_binary(search) and byte_size(search) > 0 ->
        Sentinel.search(q, search)
      _, q -> q
    end)
  end

  @doc """
  Triggers a sentinel run.

  This creates a new sentinel run that will execute all configured checks.
  The run starts in a pending state and executes asynchronously.
  """
  operation :trigger,
    operation_id: "TriggerSentinel",
    tags: ["sentinel"],
    "x-required-scopes": ["ai.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the sentinel to trigger"]
    ],
    responses: [ok: OpenAPI.AI.SentinelRun]
  def trigger(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Sentinels.run_sentinel(id, user)
    |> successful(conn, OpenAPI.AI.SentinelRun)
  end
end
