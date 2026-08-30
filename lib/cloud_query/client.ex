defmodule CloudQuery.Client do
  @moduledoc false

  @metrics_timeout :timer.seconds(30)
  @cloud_query_timeout :timer.minutes(1)
  @logs_timeout :timer.minutes(2)
  @lambda_timeout :timer.minutes(5)

  def connect(), do: connect(true)

  def metrics_rpc_opts, do: [timeout: @metrics_timeout]
  def cloud_query_rpc_opts, do: [timeout: @cloud_query_timeout]
  def logs_rpc_opts, do: [timeout: @logs_timeout]
  def lambda_rpc_opts, do: [timeout: @lambda_timeout]

  defp connect(retry?) do
    with {:ok, _} <- Application.ensure_all_started(:grpc),
         :ok <- ensure_client_supervisor() do
      host()
      |> GRPC.Stub.connect()
    end
  catch
    :exit, {:noproc, {GenServer, :call, [GRPC.Client.Supervisor | _]}} when retry? ->
      connect(false)
  end

  defp ensure_client_supervisor() do
    GRPC.Client.Supervisor
    |> Process.whereis()
    |> start_client_supervisor()
  end

  defp start_client_supervisor(nil) do
    case DynamicSupervisor.start_link(strategy: :one_for_one, name: GRPC.Client.Supervisor) do
      {:ok, _pid} -> :ok
      {:error, {:already_started, _pid}} -> :ok
      {:error, _reason} = error -> error
    end
  end

  defp start_client_supervisor(_pid), do: :ok

  defp host(), do: Console.conf(:cloudquery_host)
end
