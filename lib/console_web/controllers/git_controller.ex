defmodule ConsoleWeb.GitController do
  use ConsoleWeb, :controller
  alias Console.Deployments.Services
  alias Console.Schema.{Cluster, Service}
  require Logger

  def proceed(conn, params) do
    with %Service{} = svc <- get_service(params),
         true <- Services.proceed?(svc) do
      json(conn, %{open: true})
    else
      _ -> send_resp(conn, 402, "closed")
    end
  end

  def tarball(conn, %{"id" => service_id}) do
    with %Cluster{} = cluster <- ConsoleWeb.Plugs.Token.get_cluster(conn),
         {:ok, svc} <- Services.authorized(service_id, cluster),
         svc <- Console.Repo.preload(svc, [:revision]),
         {{:ok, f}, _} <- {Services.tarstream(svc), svc} do
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
      {{:error, err}, svc} ->
        Services.add_errors(svc, [%{source: "git", message: err}])
        send_resp(conn, 402, err)
      err ->
        Logger.error "could not fetch manifests, err: #{inspect(err)}"
        send_resp(conn, 403, "Forbidden")
    end
  end

  defp get_service(%{"id" => id}), do: Services.get_service(id)
  defp get_service(%{"cluster" => cluster, "name" => name}), do: Services.get_service_by_handle(cluster, name)
  defp get_service(_), do: nil
end
