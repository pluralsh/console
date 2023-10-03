defmodule ConsoleWeb.GitController do
  use ConsoleWeb, :controller
  alias Console.Deployments.{Services, Git.Discovery}
  alias Console.Schema.Cluster
  require Logger

  def tarball(conn, %{"id" => service_id}) do
    with %Cluster{} = cluster <- ConsoleWeb.Plugs.Token.get_cluster(conn),
         {:ok, svc} <- Services.authorized(service_id, cluster),
         {:ok, f} <- Discovery.fetch(svc) do
      try do
        conn =
          conn
          |> put_resp_content_type("application/gzip")
          |> send_chunked(200)

        IO.binstream(f, 1024)
        |> Enum.reduce_while(conn, fn line, conn ->
          case chunk(conn, line) do
            {:ok, conn} -> {:cont, conn}
            {:error, :closed} -> {:halt, conn}
          end
        end)
      after
        File.close(f)
      end
    else
      err ->
        Logger.error "could not fetch manifests, err: #{inspect(err)}"
        send_resp(conn, 403, "Forbidden")
    end
  end
end
