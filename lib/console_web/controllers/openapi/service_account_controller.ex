defmodule ConsoleWeb.OpenAPI.ServiceAccountController do
  use ConsoleWeb, :api_controller
  alias Console.Schema.User
  alias Console.Services.Users

  plug Scope, [resource: :user, action: :read] when action in [:index, :show, :show_by_email]
  plug Scope, [resource: :user, action: :write] when action in [:token]

  @doc """
  Lists all service accounts with pagination and optional search.
  """
  operation :index,
    operation_id: "ListServiceAccounts",
    tags: ["service-accounts"],
    "x-required-scopes": ["user.read"],
    parameters: [
      q: [in: :query, schema: %{type: :string}, required: false, description: "Search service accounts by name or email"],
      page: [in: :query, schema: %{type: :integer}, required: false],
      per_page: [in: :query, schema: %{type: :integer}, required: false]
    ],
    responses: [ok: OpenAPI.User.List]
  def index(conn, _params) do
    query_params = conn.private.oaskit.query_params

    User.service_account()
    |> apply_filters(query_params)
    |> User.ordered()
    |> paginate(conn, OpenAPI.User)
  end

  @doc """
  Fetches a service account by id.
  """
  operation :show,
    operation_id: "GetServiceAccount",
    tags: ["service-accounts"],
    "x-required-scopes": ["user.read"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true]
    ],
    responses: [ok: OpenAPI.User]
  def show(conn, %{"id" => id}) do
    User.service_account()
    |> Repo.get!(id)
    |> successful(conn, OpenAPI.User)
  end

  @doc """
  Fetches a service account by email.
  """
  operation :show_by_email,
    operation_id: "GetServiceAccountByEmail",
    tags: ["service-accounts"],
    "x-required-scopes": ["user.read"],
    parameters: [
      email: [in: :path, schema: %{type: :string, format: :email}, required: true]
    ],
    responses: [ok: OpenAPI.User]
  def show_by_email(conn, %{"email" => email}) do
    User.service_account()
    |> Repo.get_by!(email: email)
    |> successful(conn, OpenAPI.User)
  end

  @doc """
  Creates an access token for a service account.
  """
  operation :token,
    operation_id: "CreateServiceAccountAccessToken",
    tags: ["service-accounts"],
    "x-required-scopes": ["user.write"],
    parameters: [
      id: [in: :path, schema: %{type: :string}, required: true],
      refresh: [in: :query, schema: %{type: :boolean}, required: false, description: "If true, delete existing tokens before issuing a new one"]
    ],
    request_body: OpenAPI.AccessTokenInput,
    responses: [ok: OpenAPI.AccessToken]
  def token(conn, %{"id" => id}) do
    user = Console.Guardian.Plug.current_resource(conn)
    attrs = to_attrs(conn.private.oaskit.body_params)
    refresh = Map.get(conn.private.oaskit.query_params, :refresh, false)

    Users.create_service_account_token(attrs, refresh, id, user)
    |> successful(conn, OpenAPI.AccessToken)
  end

  defp apply_filters(query, params) do
    Enum.reduce(params, query, fn
      {:q, search}, q when is_binary(search) and byte_size(search) > 0 -> User.search(q, search)
      _, q -> q
    end)
  end
end
