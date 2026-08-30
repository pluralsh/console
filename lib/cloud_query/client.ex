defmodule CloudQuery.Client do
  @moduledoc false

  @metrics_timeout :timer.seconds(30)
  @cloud_query_timeout :timer.minutes(1)
  @logs_timeout :timer.minutes(2)
  @lambda_timeout :timer.minutes(5)

  def child_spec(_opts) do
    GRPC.Client.Connection.child_spec(
      name: __MODULE__,
      target: host(),
      adapter: GRPC.Client.Adapters.Mint
    )
  end

  def connect(), do: GRPC.Client.Connection.get_channel(__MODULE__)

  def metrics_rpc_opts, do: [timeout: @metrics_timeout]
  def cloud_query_rpc_opts, do: [timeout: @cloud_query_timeout]
  def logs_rpc_opts, do: [timeout: @logs_timeout]
  def lambda_rpc_opts, do: [timeout: @lambda_timeout]

  defp host(), do: Console.conf(:cloudquery_host)
end
