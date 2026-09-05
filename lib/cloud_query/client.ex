defmodule CloudQuery.Client do
  @moduledoc false

  @metrics_timeout :timer.seconds(30)
  @cloud_query_timeout :timer.minutes(1)
  @logs_timeout :timer.minutes(2)
  @lambda_timeout :timer.minutes(5)

  def adapter, do: GRPC.Client.Adapters.Gun
  def interceptors, do: [{CloudQuery.Client.Retry, max: 3, pause: 400, backoff: 2}]

  def connect() do
    with {:ok, channel} <- GRPC.Client.Connection.get_channel(__MODULE__),
         :ok <- GRPC.Client.Connection.await_ready(channel) do
      {:ok, channel}
    end
  end

  def metrics_rpc_opts, do: [timeout: @metrics_timeout]
  def cloud_query_rpc_opts, do: [timeout: @cloud_query_timeout]
  def logs_rpc_opts, do: [timeout: @logs_timeout]
  def lambda_rpc_opts, do: [timeout: @lambda_timeout]

end
