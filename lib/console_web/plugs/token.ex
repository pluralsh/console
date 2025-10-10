defmodule ConsoleWeb.Plugs.Token do
  import Plug.Conn
  alias Console.Deployments.Clusters
  alias Console.Services.Users
  alias Console.Schema.{Cluster, User}

  @token_key :deploy_token

  def init(opts), do: opts

  def call(conn, opts) do
    with {:ok, type, token} <- get_token(conn),
         %Plug.Conn{} = conn <- fetch_resource(type, token, {conn, opts}) do
      conn
    else
      _ -> conn
    end
  end

  def fetch_resource(:deploy, token, {conn, _opts}) do
    with %Cluster{} = cluster <- Clusters.get_by_deploy_token(token) do
      conn
      |> Absinthe.Plug.put_options(context: %{cluster: cluster})
      |> put_private(@token_key, cluster)
    end
  end

  def fetch_resource(:user, token, {conn, opts}) do
    key = Guardian.Plug.Pipeline.fetch_key(conn, opts)
    with %User{token: token} = user <- Users.get_by_token(token) do
      broadcast(user, token)
      conn
      |> Guardian.Plug.put_current_token(token.token, key: key)
      |> Guardian.Plug.put_current_resource(Console.Services.Rbac.preload(user))
      |> Guardian.Plug.put_current_claims(%{"sub" => "user:#{user.id}"}, key: key)
    end
  end

  def fetch_resource(:bootstrap, token, {conn, opts}) do
    key = Guardian.Plug.Pipeline.fetch_key(conn, opts)
    with %User{bootstrap: bootstrap} = user <- Users.get_by_bootstrap_token(token) do
      conn
      |> Guardian.Plug.put_current_token(bootstrap.token, key: key)
      |> Guardian.Plug.put_current_resource(user)
    end
  end

  def fetch_resource(:bearer, token, {conn, opts}) do
    key = Guardian.Plug.Pipeline.fetch_key(conn, opts)
    with {:ok, claims} <- Console.Guardian.decode_and_verify(token) do
      conn
      |> Guardian.Plug.put_current_token(token, key: key)
      |> Guardian.Plug.put_current_claims(claims, key: key)
    end
  end

  def broadcast(%User{service_account: true}, _), do: :ok
  def broadcast(%User{email: "console@plural.sh"}, _), do: :ok
  def broadcast(_, token) do
    Console.PubSub.Broadcaster.notify(%Console.PubSub.AccessTokenUsage{
      item: token,
      context: Console.Services.Audits.context()
    })
  end

  def get_cluster(%Plug.Conn{private: %{} = private}), do: Map.get(private, @token_key)
  def get_cluster(_), do: nil

  def get_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Token deploy-" <> _ = token | _] -> match_and_extract(~r/^Token\:?\s+(.*)$/, String.trim(token), :deploy)
      ["Token console-" <> _ = token | _] -> match_and_extract(~r/^Token\:?\s+(.*)$/, String.trim(token), :user)
      ["Token plrl-edge-" <> _ = token | _] -> match_and_extract(~r/^Token\:?\s+(.*)$/, String.trim(token), :bootstrap)
      ["Token " <> _ = token | _] -> match_and_extract(~r/^Token\:?\s+(.*)$/, String.trim(token), :bearer)
      _ -> {:error, :unauthorized}
    end
  end

  def get_bearer_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> _ = token | _] -> match_and_extract(~r/^Bearer\:?\s+(.*)$/, String.trim(token), :bearer)
      _ -> {:error, :unauthorized}
    end
  end

  def match_and_extract(regex, token, type) do
    case Regex.run(regex, token) do
      [_, match] -> {:ok, type, String.trim(match)}
      _ -> :error
    end
  end
end
