defmodule ConsoleWeb.OpenAPI.AI.AgentRunController do
  @moduledoc """
  OpenAPI controller for managing agent runs.

  An agent run represents a single execution of an AI coding agent within a runtime.
  Runs process user prompts and work on git repositories to analyze or write code.
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Agents
  alias Console.Schema.{AgentRun, AgentRunUpload}
  alias Console.Uploads
  alias ConsoleWeb.ReqStream

  plug Scope, [resource: :ai, action: :read] when action in [:show, :index, :download]
  plug Scope, [resource: :ai, action: :write] when action in [:create]

  @doc """
  Fetches an agent run by id.
  """
  operation :show,
    operation_id: "GetAgentRun",
    tags: ["agent"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the agent run"]
    ],
    responses: [ok: OpenAPI.AI.AgentRun]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Agents.get_agent_run!(id)
    |> allow(user, :read)
    |> successful(conn, OpenAPI.AI.AgentRun)
  end

  @doc """
  Lists agent runs for the current user with optional filtering by runtime.
  """
  operation :index,
    operation_id: "ListAgentRuns",
    tags: ["agent"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      runtime_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter by runtime id"],
      page: [in: :query, schema: %{type: :integer}, required: false, description: "Page number for pagination"],
      per_page: [in: :query, schema: %{type: :integer}, required: false, description: "Number of items per page"]
    ],
    responses: [ok: OpenAPI.AI.AgentRun.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    query_params = conn.private.oaskit.query_params

    AgentRun.ordered()
    |> AgentRun.for_user(user.id)
    |> apply_filters(query_params)
    |> paginate(conn, OpenAPI.AI.AgentRun)
  end

  @doc """
  Downloads file uploads associated with an agent run.
  """
  operation :download, false
  def download(conn, %{"id" => id, "name" => name}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Agents.get_agent_run!(id)
    |> Repo.preload([:upload])
    |> allow(user, :read)
    |> case do
      {:ok, %AgentRun{upload: %AgentRunUpload{} = upload}} ->
        resolve_upload(upload, name, conn)
      {:ok, _} -> {:error, "No uploads found for this run"}
      err -> err
    end
  end

  defp resolve_upload(%AgentRunUpload{} = upload, type, conn) do
    with {:ok, url} <- signed_url(upload, type) do
      ReqStream.get(conn, Req.new(), [url: url, redirect: true], error_message: "Agent Run upload failed to download")
    end
  end

  defp signed_url(%AgentRunUpload{} = upload, "patch"), do: signed_url(upload, :patch)
  defp signed_url(%AgentRunUpload{} = upload, "session"), do: signed_url(upload, :session)
  defp signed_url(%AgentRunUpload{} = upload, "screen_recording"), do: signed_url(upload, :screen_recording)
  defp signed_url(%AgentRunUpload{} = upload, field) when is_atom(field) do
    case Map.get(upload, field) do
      nil -> {:error, "No #{field} upload found for this run"}
      file -> {:ok, Uploads.url({file, upload}, :original, signed: true)}
    end
  end
  defp signed_url(_, name), do: {:error, "Invalid upload type: #{name}"}

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:runtime_id, id}, q when is_binary(id) -> AgentRun.for_runtime(q, id)
      _, q -> q
    end)
  end

  @doc """
  Creates a new agent run on the specified runtime.

  The agent run will start in a pending state and be picked up by the runtime
  for execution. The agent will process the prompt against the specified repository.
  """
  operation :create,
    operation_id: "CreateAgentRun",
    tags: ["agent"],
    "x-required-scopes": ["ai.write"],
    request_body: OpenAPI.AI.AgentRunInput,
    responses: [ok: OpenAPI.AI.AgentRun]
  def create(conn, %{"runtime_id" => runtime_id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Agents.create_agent_run(runtime_id, user)
    |> successful(conn, OpenAPI.AI.AgentRun)
  end
end
