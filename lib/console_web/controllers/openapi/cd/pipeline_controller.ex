defmodule ConsoleWeb.OpenAPI.CD.PipelineController do
  @moduledoc """
  OpenAPI controller for managing pipelines.

  A pipeline enables continuous deployment workflows by defining stages that services
  progress through, with gates for approval and promotion criteria between stages.
  Pipelines can be triggered by creating new contexts that flow through the stages.
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Pipelines
  alias Console.Schema.Pipeline

  plug Scope, [resource: :pipelines, action: :read] when action in [:show, :index]
  plug Scope, [resource: :pipelines, action: :write] when action in [:trigger]

  @doc """
  Fetches a pipeline by id.

  Returns a single pipeline with its stages, edges, and gates.
  """
  operation :show,
    operation_id: "GetPipeline",
    summary: "Get a pipeline by ID",
    description: "Retrieves a single pipeline by its unique identifier, including its stages, edges, and gates",
    tags: ["pipelines"],
    "x-required-scopes": ["pipelines.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the pipeline"]
    ],
    responses: [ok: OpenAPI.CD.Pipeline]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Pipelines.get_pipeline!(id)
    |> Repo.preload([stages: [services: :criteria], edges: :gates])
    |> allow(user, :read)
    |> successful(conn, OpenAPI.CD.Pipeline)
  end

  @doc """
  Lists pipelines with optional filtering by project and search query.

  Returns a paginated list of pipelines the user has access to.
  """
  operation :index,
    operation_id: "ListPipelines",
    summary: "List all pipelines",
    description: "Returns a paginated list of all pipelines the authenticated user has access to",
    tags: ["pipelines"],
    "x-required-scopes": ["pipelines.read"],
    parameters: [
      project_id: [in: :query, schema: %{type: :string}, required: false, description: "Filter pipelines by project ID"],
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search pipelines by name"],
      page: [in: :query, schema: %{type: :integer}, required: false, description: "Page number for pagination"],
      per_page: [in: :query, schema: %{type: :integer}, required: false, description: "Number of items per page"]
    ],
    responses: [ok: OpenAPI.CD.Pipeline.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    query_params = conn.private.oaskit.query_params

    Pipeline.for_user(user)
    |> apply_filters(query_params)
    |> Pipeline.ordered()
    |> Pipeline.preloaded()
    |> paginate(conn, OpenAPI.CD.Pipeline)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:project_id, id}, q when is_binary(id) -> Pipeline.for_project(q, id)
      {:q, search}, q when is_binary(search) and byte_size(search) > 0 -> Pipeline.search(q, search)
      _, q -> q
    end)
  end

  @doc """
  Triggers a pipeline by creating a new context.

  Creates a new pipeline context with the provided data, which will flow through
  the pipeline stages and can be used to contextualize PR automations and promotions.
  """
  operation :trigger,
    operation_id: "TriggerPipeline",
    summary: "Trigger a pipeline run",
    description: "Creates a new pipeline context to trigger a pipeline run. The context data flows through stages and can be used for PR automations.",
    tags: ["pipelines"],
    "x-required-scopes": ["pipelines.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the pipeline to trigger"]
    ],
    request_body: OpenAPI.CD.PipelineContextInput,
    responses: [ok: OpenAPI.CD.PipelineContext]
  def trigger(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Pipelines.create_pipeline_context(id, user)
    |> successful(conn, OpenAPI.CD.PipelineContext)
  end
end
