defmodule ConsoleWeb.GitController do
  use ConsoleWeb, :controller
  alias Console.Deployments.{Services, Stacks}
  alias Console.Schema.{Cluster, Service}
  alias Console.Deployments.Local.Server, as: FileServer
  require Logger

  def proceed(conn, params) do
    with %Service{} = svc <- get_service(params),
         true <- Services.proceed?(svc) do
      json(conn, %{open: true})
    else
      _ -> send_resp(conn, 402, "closed")
    end
  end

  def rollback(conn, params) do
    with %Service{} = svc <- get_service(params),
         true <- Services.rollback?(svc) do
      json(conn, %{open: true})
    else
      _ -> send_resp(conn, 402, "closed")
    end
  end

  def stack_tarball(conn, %{"id" => run_id}) do
    with %Cluster{} = cluster <- ConsoleWeb.Plugs.Token.get_cluster(conn),
         {:ok, run} <- Stacks.authorized(run_id, cluster),
         run <- Console.Repo.preload(run, [:repository]),
         {{:ok, sha}, _} <- {Stacks.digest(run), run},
         {{:ok, path}, _} <- {FileServer.fetch(sha, fn -> Stacks.tarstream(run) end), run} do
      chunk_send_tar(conn, File.open!(path, [:raw]))
    else
      {{:error, err}, run} ->
        Stacks.add_errors(run, [%{source: "git", message: err}])
        send_resp(conn, 402, err)
      err ->
        Logger.info "could not fetch manifests, err: #{inspect(err)}"
        send_resp(conn, 403, "Forbidden")
    end
  end

  def digest(conn, %{"id" => service_id}) do
    with %Cluster{} = cluster <- ConsoleWeb.Plugs.Token.get_cluster(conn),
         {:ok, svc} <- Services.authorized(service_id, cluster),
         svc <- Console.Repo.preload(svc, [:revision]),
         {{:ok, svc}, _} <- {Services.dependencies_ready(svc), svc},
         {{:ok, sha}, _} <- {Services.digest(svc), svc} do
      send_resp(conn, 200, sha)
    else
      {{:error, err}, svc} ->
        Services.add_errors(svc, [%{source: "git", message: err}])
        send_resp(conn, 402, err)
      err ->
        Logger.info "could not fetch manifests, err: #{inspect(err)}"
        send_resp(conn, 403, "Forbidden")
    end
  end

  def tarball(conn, %{"id" => service_id} = params) do
    with %Cluster{} = cluster <- ConsoleWeb.Plugs.Token.get_cluster(conn),
         {:ok, svc} <- Services.authorized(service_id, cluster),
         svc <- Console.Repo.preload(svc, [:revision]),
         {{:ok, svc}, _} <- {Services.dependencies_ready(svc), svc},
         {{:ok, sha}, _} <- {get_digest(params, svc), svc},
         {{:ok, path}, _} <- {FileServer.fetch(sha, fn -> Services.tarstream(svc) end), svc} do
      chunk_send_tar(conn, File.open!(path, [:raw]))
    else
      {{:error, err}, svc} ->
        Services.add_errors(svc, [%{source: "git", message: err}])
        send_resp(conn, 402, err)
      err ->
        Logger.info "could not fetch manifests, err: #{inspect(err)}"
        send_resp(conn, 403, "Forbidden")
    end
  end

  defp get_digest(%{"digest" => digest}, _), do: {:ok, digest}
  defp get_digest(_, %Service{} = svc), do: Services.digest(svc)

  defp chunk_send_tar(conn, f) do
    try do
      conn =
        conn
        |> put_resp_content_type("application/gzip")
        |> send_chunked(200)

      IO.binstream(f, Console.conf(:chunk_size))
      |> Enum.reduce_while(conn, fn line, conn ->
        case chunk(conn, line) do
          {:ok, conn} -> {:cont, conn}
          {:error, :closed} -> {:halt, conn}
        end
      end)
    after
      File.close(f)
    end
  end

  defp get_service(%{"id" => id}), do: Services.get_service(id)
  defp get_service(%{"cluster" => cluster, "name" => name}), do: Services.get_service_by_handle(cluster, name)
  defp get_service(_), do: nil
end
