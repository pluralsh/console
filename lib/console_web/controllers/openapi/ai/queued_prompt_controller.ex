defmodule ConsoleWeb.OpenAPI.AI.QueuedPromptController do
  @moduledoc """
  OpenAPI controller for deferred workbench prompts.
  """
  use ConsoleWeb, :api_controller
  alias Console.Deployments.Workbenches

  plug Scope, [resource: :ai, action: :read] when action in [:create, :delete]

  @doc """
  Queues a prompt to be sent to a workbench job later.
  """
  operation :create,
    operation_id: "CreateQueuedPrompt",
    tags: ["workbench"],
    "x-required-scopes": ["workbench.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the workbench job"]
    ],
    request_body: OpenAPI.AI.QueuedPromptInput,
    responses: [ok: OpenAPI.AI.QueuedPrompt]
  def create(conn, %{"id" => job_id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Workbenches.create_queued_prompt(job_id, user)
    |> successful(conn, OpenAPI.AI.QueuedPrompt)
  end

  @doc """
  Deletes a queued prompt.
  """
  operation :delete,
    operation_id: "DeleteQueuedPrompt",
    tags: ["workbench"],
    "x-required-scopes": ["workbench.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true, description: "The unique identifier of the queued prompt"]
    ],
    responses: [ok: OpenAPI.AI.QueuedPrompt]
  def delete(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Workbenches.delete_queued_prompt(id, user)
    |> successful(conn, OpenAPI.AI.QueuedPrompt)
  end
end
