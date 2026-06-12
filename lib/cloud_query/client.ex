defmodule CloudQuery.Client do
  @moduledoc false

  @metrics_timeout :timer.seconds(30)
  @cloud_query_timeout :timer.minutes(1)
  @logs_timeout :timer.minutes(2)

  def connect() do
    host()
    |> GRPC.Stub.connect()
  end

  def metrics_rpc_opts, do: [timeout: @metrics_timeout]
  def cloud_query_rpc_opts, do: [timeout: @cloud_query_timeout]
  def logs_rpc_opts, do: [timeout: @logs_timeout]

  defp host(), do: Console.conf(:cloudquery_host)
end
