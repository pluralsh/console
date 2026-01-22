defmodule ConsoleWeb.OpenAPI.SCM.ConnectionController do
  use ConsoleWeb, :api_controller
  alias Console.Deployments.Git
  alias Console.Schema.ScmConnection

  operation :show,
    operation_id: "GetScmConnection",
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.SCM.Connection]
  def show(conn, %{"id" => id}) do
    Git.get_scm_connection!(id)
    |> then(&{:ok, &1})
    |> successful(conn, OpenAPI.SCM.Connection)
  end

  operation :index,
    operation_id: "ListScmConnections",
    parameters: [
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.SCM.Connection.List]
  def index(conn, _params) do
    ScmConnection.ordered()
    |> paginate(conn, OpenAPI.SCM.Connection)
  end

  operation :create,
    operation_id: "CreateScmConnection",
    request_body: OpenAPI.SCM.ConnectionInput,
    responses: [ok: OpenAPI.SCM.Connection]
  def create(conn, _) do
    user = Console.Guardian.Plug.current_resource(conn)
    to_attrs(conn.private.oaskit.body_params)
    |> Git.create_scm_connection(user)
    |> successful(conn, OpenAPI.SCM.Connection)
  end

  operation :update,
    operation_id: "UpdateScmConnection",
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    request_body: OpenAPI.SCM.ConnectionInput,
    responses: [ok: OpenAPI.SCM.Connection]
  def update(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Git.update_scm_connection(id, user)
    |> successful(conn, OpenAPI.SCM.Connection)
  end

  operation :delete,
    operation_id: "DeleteScmConnection",
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.SCM.Connection]
  def delete(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Git.delete_scm_connection(id, user)
    |> successful(conn, OpenAPI.SCM.Connection)
  end
end
