defmodule ConsoleWeb.OpenAPI.AI.WorkbenchJobController do
  @moduledoc """
  OpenAPI controller for workbench jobs.

  A workbench job represents a single run of a workbench (e.g. one prompt execution).
  """
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Workbenches
  alias Console.Schema.WorkbenchJob

  plug Scope, [resource: :ai, action: :read] when action in [:show, :index, :create]

  @doc """
  Fetches a workbench job by id.
  """
  operation :show,
    operation_id: "GetWorkbenchJob",
    tags: ["workbench"],
    "x-required-scopes": ["ai.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the workbench job"]
    ],
    responses: [ok: OpenAPI.AI.WorkbenchJob]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Workbenches.get_workbench_job!(id)
    |> Console.Repo.preload(:result)
    |> allow(user, :read)
    |> successful(conn, OpenAPI.AI.WorkbenchJob)
  end

  @doc """
  Lists workbench jobs for a workbench.
  """
  operation :index,
    operation_id: "ListWorkbenchJobs",
    tags: ["workbench"],
    "x-required-scopes": ["workbench.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the workbench"],
      page: [in: :query, schema: %{type: :integer}, required: false, description: "Page number for pagination"],
      per_page: [in: :query, schema: %{type: :integer}, required: false, description: "Number of items per page"]
    ],
    responses: [ok: OpenAPI.AI.WorkbenchJob.List]
  def index(conn, %{"id" => workbench_id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    with {:ok, workbench} <- allow(Workbenches.get_workbench!(workbench_id), user, :read) do
      WorkbenchJob.for_workbench(workbench.id)
      |> WorkbenchJob.ordered()
      |> WorkbenchJob.preloaded()
      |> paginate(conn, OpenAPI.AI.WorkbenchJob)
    end
  end

  @doc """
  Creates a new workbench job for the given workbench.
  """
  operation :create,
    operation_id: "CreateWorkbenchJob",
    tags: ["workbench"],
    "x-required-scopes": ["workbench.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the workbench"]
    ],
    request_body: OpenAPI.AI.WorkbenchJobInput,
    responses: [ok: OpenAPI.AI.WorkbenchJob]
  def create(conn, %{"id" => workbench_id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Workbenches.create_workbench_job(workbench_id, user)
    |> when_ok(&Console.Repo.preload(&1, :result))
    |> successful(conn, OpenAPI.AI.WorkbenchJob)
  end
end
