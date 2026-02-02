defmodule ConsoleWeb.OpenAPI.CD.HelmRepositoryController do
  use ConsoleWeb, :api_controller
  alias Console.Deployments.Git
  alias Console.Schema.HelmRepository

  plug Scope, [resource: :repos, action: :read] when action in [:show, :index, :show_by_url]
  plug Scope, [resource: :repos, action: :write] when action in [:upsert]

  operation :show,
    operation_id: "GetHelmRepository",
    tags: ["repos"],
    "x-required-scopes": ["repos.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.CD.HelmRepository]
  def show(conn, %{"id" => id}) do
    Git.get_helm_repository!(id)
    |> then(&{:ok, &1})
    |> successful(conn, OpenAPI.CD.HelmRepository)
  end

  operation :show_by_url,
    operation_id: "GetHelmRepositoryByUrl",
    tags: ["repos"],
    "x-required-scopes": ["repos.read"],
    parameters: [
      url: [in: :query, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.CD.HelmRepository]
  def show_by_url(conn, %{"url" => url}) do
      Git.get_helm_repository_by_url!(url)
      |> then(&{:ok, &1})
      |> successful(conn, OpenAPI.CD.HelmRepository)
  end

  operation :index,
    operation_id: "ListHelmRepositories",
    tags: ["repos"],
    "x-required-scopes": ["repos.read"],
    parameters: [
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search helm repositories by url"],
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.CD.HelmRepository.List]
  def index(conn, _params) do
    query_params = conn.private.oaskit.query_params

    HelmRepository.ordered()
    |> apply_filters(query_params)
    |> paginate(conn, OpenAPI.CD.HelmRepository)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:q, search}, q when is_binary(search) and byte_size(search) > 0 ->
        HelmRepository.search(q, search)
      _, q -> q
    end)
  end

  operation :upsert,
    operation_id: "UpsertHelmRepository",
    tags: ["repos"],
    "x-required-scopes": ["repos.write"],
    request_body: OpenAPI.CD.HelmRepositoryInput,
    responses: [ok: OpenAPI.CD.HelmRepository]
  def upsert(conn, _) do
    user = Console.Guardian.Plug.current_resource(conn)
    case conn.private.oaskit.body_params do
      %{url: url} when is_binary(url) ->
        to_attrs(conn.private.oaskit.body_params)
        |> Git.upsert_helm_repository(url, user)
        |> successful(conn, OpenAPI.CD.HelmRepository)
      _ -> {:error, "url is a required field"}
    end
  end
end
