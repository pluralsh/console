defmodule Console.PseudoFS.Client do
  @moduledoc false

  @timeout :timer.seconds(30)
  @stream_timeout :timer.minutes(5)

  def adapter, do: GRPC.Client.Adapters.Gun

  def connect() do
    with {:ok, channel} <- GRPC.Client.Connection.get_channel(__MODULE__),
         :ok <- GRPC.Client.Connection.await_ready(channel) do
      {:ok, channel}
    end
  end

  def rpc_opts, do: [timeout: @timeout]
  def stream_opts, do: [timeout: @stream_timeout]
end
