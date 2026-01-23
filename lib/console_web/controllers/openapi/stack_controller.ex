defmodule ConsoleWeb.OpenAPI.StackController do
  use ConsoleWeb, :api_controller
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Stacks
  alias Console.Schema.Stack

  plug Scope, [resource: :stacks, action: :read] when action in [:show, :index]
  plug Scope, [resource: :stacks, action: :write] when action in [:create, :update, :delete, :trigger_run, :resync, :restore]

  operation :show,
    operation_id: "GetStack",
    tags: ["stacks"],
    "x-required-scopes": ["stacks.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.Stack]
  def show(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    Stacks.get_stack!(id)
    |> Repo.preload([:tags])
    |> allow(user, :read)
    |> successful(conn, OpenAPI.Stack)
  end

  operation :index,
    operation_id: "ListStacks",
    tags: ["stacks"],
    "x-required-scopes": ["stacks.read"],
    parameters: [
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.Stack.List]
  def index(conn, _params) do
    user = Console.Guardian.Plug.current_resource(conn)
    Stack.for_user(user)
    |> Stack.ordered()
    |> Stack.preloaded([:tags])
    |> paginate(conn, OpenAPI.Stack)
  end

  operation :create,
    operation_id: "CreateStack",
    tags: ["stacks"],
    "x-required-scopes": ["stacks.write"],
    request_body: OpenAPI.StackInput,
    responses: [ok: OpenAPI.Stack]
  def create(conn, _) do
    user = Console.Guardian.Plug.current_resource(conn)
    to_attrs(conn.private.oaskit.body_params)
    |> Stacks.create_stack(user)
    |> when_ok(&Repo.preload(&1, [:tags]))
    |> successful(conn, OpenAPI.Stack)
  end

  operation :update,
    operation_id: "UpdateStack",
    tags: ["stacks"],
    "x-required-scopes": ["stacks.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    request_body: OpenAPI.StackInput,
    responses: [ok: OpenAPI.Stack]
  def update(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Stacks.update_stack(id, user)
    |> when_ok(&Repo.preload(&1, [:tags]))
    |> successful(conn, OpenAPI.Stack)
  end

  operation :delete,
    operation_id: "DeleteStack",
    tags: ["stacks"],
    "x-required-scopes": ["stacks.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true],
      detach: [in: :query, schema: %{type: :boolean}, required: false]
    ],
    responses: [ok: OpenAPI.Stack]
  def delete(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    case conn.private.oaskit.query_params[:detach] do
      true -> Stacks.detach_stack(id, user)
      _ -> Stacks.delete_stack(id, user)
    end
    |> when_ok(&Repo.preload(&1, [:tags]))
    |> successful(conn, OpenAPI.Stack)
  end

  @doc """
  Triggers a new stack run from the newest sha in the stack's run history
  """
  operation :trigger_run,
    operation_id: "TriggerStackRun",
    tags: ["stacks"],
    "x-required-scopes": ["stacks.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.StackRun]
  def trigger_run(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Stacks.trigger_run(id, user)
    |> successful(conn, OpenAPI.StackRun)
  end

  @doc """
  Refresh the source repo of this stack, and potentially create a fresh run
  """
  operation :resync,
    operation_id: "ResyncStack",
    tags: ["stacks"],
    "x-required-scopes": ["stacks.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.StackRun]
  def resync(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Stacks.kick(id, user)
    |> successful(conn, OpenAPI.StackRun)
  end

  @doc """
  Un-deletes a stack and cancels the destroy run that was spawned to remove its managed infrastructure
  """
  operation :restore,
    operation_id: "RestoreStack",
    tags: ["stacks"],
    "x-required-scopes": ["stacks.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.Stack]
  def restore(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Stacks.restore_stack(id, user)
    |> when_ok(&Repo.preload(&1, [:tags]))
    |> successful(conn, OpenAPI.Stack)
  end
end
