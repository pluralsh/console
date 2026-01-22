defmodule ConsoleWeb.OpenAPI.CD.GitRepositoryController do
  use ConsoleWeb, :api_controller
  alias Console.Deployments.Git
  alias Console.Schema.GitRepository

  operation :show,
    operation_id: "GetGitRepository",
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.CD.GitRepository]
  def show(conn, %{"id" => id}) do
    Git.get_repository!(id)
    |> then(&{:ok, &1})
    |> successful(conn, OpenAPI.CD.GitRepository)
  end

  operation :show_by_url,
    operation_id: "GetGitRepositoryByUrl",
    parameters: [
      url: [in: :query, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.CD.GitRepository]
  def show_by_url(conn, %{"url" => url}) do
    Git.get_by_url!(url)
    |> then(&{:ok, &1})
    |> successful(conn, OpenAPI.CD.GitRepository)
  end

  operation :index,
    operation_id: "ListGitRepositories",
    parameters: [
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.CD.GitRepository.List]
  def index(conn, _params) do
    GitRepository.ordered()
    |> paginate(conn, OpenAPI.CD.GitRepository)
  end

  operation :create,
    operation_id: "CreateGitRepository",
    request_body: OpenAPI.CD.GitRepositoryInput,
    responses: [ok: OpenAPI.CD.GitRepository]
  def create(conn, _) do
    user = Console.Guardian.Plug.current_resource(conn)
    to_attrs(conn.private.oaskit.body_params)
    |> Git.create_repository(user)
    |> successful(conn, OpenAPI.CD.GitRepository)
  end

  operation :update,
    operation_id: "UpdateGitRepository",
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    request_body: OpenAPI.CD.GitRepositoryInput,
    responses: [ok: OpenAPI.CD.GitRepository]
  def update(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    to_attrs(conn.private.oaskit.body_params)
    |> Git.update_repository(id, user)
    |> successful(conn, OpenAPI.CD.GitRepository)
  end

  operation :delete,
    operation_id: "DeleteGitRepository",
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.CD.GitRepository]
  def delete(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)

    Git.delete_repository(id, user)
    |> successful(conn, OpenAPI.CD.GitRepository)
  end
end
