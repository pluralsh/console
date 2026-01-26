defmodule ConsoleWeb.OpenAPI.AI.SentinelRunController do
  @moduledoc """
  OpenAPI controller for managing sentinel runs.

  A sentinel run represents a single execution of a sentinel's monitoring checks.
  Each run contains results from individual checks and may spawn integration test jobs.
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Sentinels
  alias Console.Schema.SentinelRun

  plug Scope, [resource: :ai, action: :read] when action in [:show, :index]

  @doc """
  Fetches a sentinel run by id.
  """
  operation :show,
    operation_id: "GetSentinelRun",
    tags: ["sentinel"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the sentinel run"]
    ],
    responses: [ok: OpenAPI.AI.SentinelRun]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Sentinels.get_sentinel_run!(id)
    |> allow(user, :read)
    |> when_ok(&Repo.preload(&1, [:jobs]))
    |> successful(conn, OpenAPI.AI.SentinelRun)
  end

  @doc """
  Lists all runs for a specific sentinel.
  """
  operation :index,
    operation_id: "ListSentinelRuns",
    tags: ["sentinel"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      sentinel_id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the sentinel"],
      page: [in: :query, schema: %{type: :integer}, required: false, description: "Page number for pagination"],
      per_page: [in: :query, schema: %{type: :integer}, required: false, description: "Number of items per page"]
    ],
    responses: [ok: OpenAPI.AI.SentinelRun.List]
  def index(conn, %{"sentinel_id" => sentinel_id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Sentinels.get_sentinel!(sentinel_id)
    |> allow(user, :read)
    |> case do
      {:ok, sentinel} ->
        SentinelRun.for_sentinel(sentinel.id)
        |> SentinelRun.ordered()
        |> paginate(conn, OpenAPI.AI.SentinelRun)
      error -> error
    end
  end
end
