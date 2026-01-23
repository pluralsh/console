defmodule ConsoleWeb.OpenAPI.AI.AgentSessionController do
  @moduledoc """
  OpenAPI controller for managing agent sessions.

  An agent session represents an autonomous AI agent working on infrastructure tasks
  like terraform management, kubernetes operations, provisioning, and more. Sessions
  are associated with chat threads and operate based on user prompts.
  """
  use ConsoleWeb, :api_controller
  alias Console.AI.Chat
  alias Console.Schema.AgentSession

  plug Scope, [resource: :ai, action: :read] when action in [:show, :index]
  plug Scope, [resource: :ai, action: :write] when action in [:create]

  @doc """
  Fetches an agent session by id.
  """
  operation :show,
    operation_id: "GetAgentSession",
    tags: ["agent"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the agent session"]
    ],
    responses: [ok: OpenAPI.AI.AgentSession]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    AgentSession.for_user(user.id)
    |> Repo.get!(id)
    |> successful(conn, OpenAPI.AI.AgentSession)
  end

  @doc """
  Lists agent sessions for the current user.
  """
  operation :index,
    operation_id: "ListAgentSessions",
    tags: ["agent"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      page: [in: :query, schema: %{type: :integer}, required: false, description: "Page number for pagination"],
      per_page: [in: :query, schema: %{type: :integer}, required: false, description: "Number of items per page"]
    ],
    responses: [ok: OpenAPI.AI.AgentSession.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)

    AgentSession.for_user(user.id)
    |> AgentSession.agent()
    |> AgentSession.ordered()
    |> paginate(conn, OpenAPI.AI.AgentSession)
  end

  @doc """
  Creates a new agent session.

  This creates a chat thread with an associated agent session that will operate
  autonomously based on the provided prompt. The session starts working immediately
  after creation.
  """
  operation :create,
    operation_id: "CreateAgentSession",
    tags: ["agent"],
    "x-required-scopes": ["ai.write"],
    request_body: OpenAPI.AI.AgentSessionInput,
    responses: [ok: OpenAPI.AI.AgentSession]
  def create(conn, _) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Chat.create_agent_session(user)
    |> when_ok(fn thread ->
      Repo.preload(thread, [:session])
      |> Map.get(:session)
    end)
    |> successful(conn, OpenAPI.AI.AgentSession)
  end
end
