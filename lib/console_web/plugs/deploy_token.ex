defmodule ConsoleWeb.Plugs.DeployToken do
  import Plug.Conn
  alias Console.Deployments.Clusters
  alias Console.Schema.Cluster

  @token_key :deploy_token

  def init(opts), do: opts

  def call(conn, _opts) do
    with {:ok, token} <- get_token(conn),
         %Cluster{} = cluster <- Clusters.get_by_deploy_token(token) do
      conn
      |> Absinthe.Plug.put_options(context: %{cluster: cluster})
      |> put_private(@token_key, cluster)
    else
      _ -> conn
    end
  end

  def get_cluster(%Plug.Conn{private: %{} = private}), do: Map.get(private, @token_key)
  def get_cluster(_), do: nil

  defp get_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Token deploy-" <> _ = token | _] -> match_and_extract(~r/^Token\:?\s+(.*)$/, String.trim(token))
      _ -> {:error, :unauthorized}
    end
  end

  defp match_and_extract(regex, token) do
    case Regex.run(regex, token) do
      [_, "deploy-" <> _ = match] -> {:ok, String.trim(match)}
      _ -> :error
    end
  end
end
