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
      broadcast(token)
      conn
      |> Guardian.Plug.put_current_token(token.token, key: key)
      |> Guardian.Plug.put_current_claims(%{"sub" => "user:#{user.id}"}, key: key)
    end
  end

  def broadcast(token) do
    Console.PubSub.Broadcaster.notify(%Console.PubSub.AccessTokenUsage{
      item: token,
      context: Console.Services.Audits.context()
    })
  end

  def get_cluster(%Plug.Conn{private: %{} = private}), do: Map.get(private, @token_key)
  def get_cluster(_), do: nil

  defp get_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Token deploy-" <> _ = token | _] -> match_and_extract(~r/^Token\:?\s+(.*)$/, String.trim(token), :deploy)
      ["Token console-" <> _ = token | _] -> match_and_extract(~r/^Token\:?\s+(.*)$/, String.trim(token), :user)
      _ -> {:error, :unauthorized}
    end
  end

  defp match_and_extract(regex, token, type) do
    case Regex.run(regex, token) do
      [_, match] -> {:ok, type, String.trim(match)}
      _ -> :error
    end
  end
end
