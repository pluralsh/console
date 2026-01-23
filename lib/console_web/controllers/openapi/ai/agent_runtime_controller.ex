defmodule ConsoleWeb.OpenAPI.AI.AgentRuntimeController do
  @moduledoc """
  OpenAPI controller for managing agent runtimes.

  An agent runtime is a configured environment deployed on a cluster for executing
  AI coding agents. Runtimes define the execution context and capabilities available
  to agent runs.
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Agents
  alias Console.Schema.AgentRuntime

  plug Scope, [resource: :ai, action: :read] when action in [:show, :index]

  @doc """
  Fetches an agent runtime by id.
  """
  operation :show,
    operation_id: "GetAgentRuntime",
    tags: ["agent"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the agent runtime"]
    ],
    responses: [ok: OpenAPI.AI.AgentRuntime]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Agents.get_agent_runtime!(id)
    |> allow(user, :create)
    |> successful(conn, OpenAPI.AI.AgentRuntime)
  end

  @doc """
  Lists agent runtimes with optional filtering by type and search query.
  """
  operation :index,
    operation_id: "ListAgentRuntimes",
    tags: ["agent"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      type: [in: :query, schema: %{type: :string, enum: [:claude, :opencode, :gemini, :custom]}, required: false, description: "Filter by runtime type"],
      page: [in: :query, schema: %{type: :integer}, required: false, description: "Page number for pagination"],
      per_page: [in: :query, schema: %{type: :integer}, required: false, description: "Number of items per page"]
    ],
    responses: [ok: OpenAPI.AI.AgentRuntime.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    query_params = conn.private.oaskit.query_params

    AgentRuntime.ordered()
    |> AgentRuntime.for_user(user)
    |> apply_filters(query_params)
    |> paginate(conn, OpenAPI.AI.AgentRuntime)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:type, type}, q when is_atom(type) -> AgentRuntime.for_type(q, type)
      {:type, type}, q when is_binary(type) -> AgentRuntime.for_type(q, type)
      _, q -> q
    end)
  end
end
