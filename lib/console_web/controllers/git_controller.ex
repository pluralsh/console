defmodule ConsoleWeb.GitController do
  use ConsoleWeb, :controller
  alias Console.Deployments.{Services, Git.Discovery}
  alias Console.Schema.Cluster

  def tarball(conn, %{"id" => service_id}) do
    with %Cluster{} = cluster <- ConsoleWeb.Plugs.DeployToken.get_cluster(conn),
         {:ok, svc} <- Services.authorized(service_id, cluster),
         {:ok, f} <- Discovery.fetch(svc) do
      conn =
        conn
        |> put_resp_content_type("application/gzip")
        |> send_chunked(200)

      Enum.reduce_while(f, conn, fn line, conn ->
        case chunk(conn, line) do
          {:ok, conn} -> {:cont, conn}
          {:error, :closed} -> {:halt, conn}
        end
      end)
    else
      _ -> send_resp(conn, 403, "Forbidden")
    end
  end
end
