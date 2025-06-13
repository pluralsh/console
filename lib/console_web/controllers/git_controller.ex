defmodule ConsoleWeb.GitController do
  use ConsoleWeb, :controller
  alias Console.SmartFile
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

  def agent_chart(conn, _) do
    path = Console.Deployments.Settings.agent_chart()
    chunk_send_tar(conn, File.open!(path, [:raw]))
  end

  def stack_tarball(conn, %{"id" => run_id}) do
    with %Cluster{} = cluster <- ConsoleWeb.Plugs.Token.get_cluster(conn),
         {:ok, run} <- Stacks.authorized(run_id, cluster),
         run <- Console.Repo.preload(run, [:repository]),
         {:ok, f} <- Stacks.tarstream(run) do
      chunk_send_tar(conn, f)
    else
      {{:error, :rate_limited}, run} ->
        Stacks.add_errors(run, [%{source: "git", message: "Rate limited"}])
        send_resp(conn, 429, "Rate limited")
      {{:error, err}, run} ->
        Stacks.add_errors(run, [%{source: "git", message: stringify(err)}])
        send_resp(conn, 402, stringify(err))
      _err -> send_resp(conn, 403, "Forbidden")
    end
  end

  def digest(conn, %{"id" => service_id}) do
    with %Cluster{} = cluster <- ConsoleWeb.Plugs.Token.get_cluster(conn),
         {:ok, svc} <- Services.authorized(service_id, cluster),
         svc <- Console.Repo.preload(svc, [:revision]),
         {{:ok, sha}, _} <- {Services.digest(svc), svc} do
      send_resp(conn, 200, sha)
    else
      {{:error, :rate_limited}, svc} ->
        Services.add_errors(svc, [%{source: "git", message: "Rate limited"}])
        send_resp(conn, 429, "Rate limited")
      {{:error, err}, svc} ->
        Services.add_errors(svc, [%{source: "git", message: stringify(err)}])
        send_resp(conn, 402, stringify(err))
      _err -> send_resp(conn, 403, "Forbidden")
    end
  end

  def tarball(conn, %{"id" => service_id} = params) do
    with %Cluster{} = cluster <- ConsoleWeb.Plugs.Token.get_cluster(conn),
         {:ok, svc} <- Services.authorized(service_id, cluster),
         svc <- Console.Repo.preload(svc, [:revision]),
         {{:ok, svc}, _} <- {Services.dependencies_ready(svc), svc},
         {{:ok, sha}, _} <- {get_digest(params, svc), svc},
         {{:ok, path, sha}, _} <- {FileServer.fetch_with_sha(sha, fn -> svc_tarball(svc) end), svc} do
      put_resp_header(conn, "x-plrl-digest", sha)
      |> chunk_send_tar(path)
    else
      {{:error, :rate_limited}, svc} ->
        Services.add_errors(svc, [%{source: "git", message: "Rate limited"}])
        send_resp(conn, 429, "Rate limited")
      {{:error, err}, svc} ->
        Services.add_errors(svc, [%{source: "git", message: stringify(err)}])
        send_resp(conn, 402, stringify(err))
      _ -> send_resp(conn, 403, "Forbidden")
    end
  end

  defp svc_tarball(%Service{} = svc) do
    with {:ok, sha} <- Services.digest(svc),
         {:ok, f} <- Services.tarstream(svc),
      do: {:ok, f, sha}
  end

  defp stringify(err) when is_binary(err), do: err
  defp stringify(err), do: inspect(err)

  defp get_digest(%{"digest" => digest}, _), do: {:ok, digest}
  defp get_digest(_, %Service{} = svc), do: Services.digest(svc)

  defp chunk_send_tar(conn, f) do
    smart = SmartFile.new(f)
    with {:ok, f} <- SmartFile.convert(smart) do
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
  end

  defp get_service(%{"id" => id}), do: Services.get_service(id)
  defp get_service(%{"cluster" => cluster, "name" => name}), do: Services.get_service_by_handle(cluster, name)
  defp get_service(_), do: nil
end
