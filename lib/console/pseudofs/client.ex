defmodule Console.PseudoFS.Client do
  @moduledoc false

  @timeout :timer.seconds(30)
  @stream_timeout :timer.minutes(5)

  def adapter, do: GRPC.Client.Adapters.Gun

  # gun never pings by default, so a peer lost without a FIN (eg node failure) leaves a half-open
  # connection until the kernel gives up on it; pings + tolerance tear it down within ~45s
  def adapter_opts, do: [connect_timeout: :timer.seconds(5), http2_opts: %{keepalive: :timer.seconds(15), keepalive_tolerance: 2}]

  def connect() do
    with {:ok, channel} <- GRPC.Client.Connection.get_channel(__MODULE__),
         :ok <- GRPC.Client.Connection.await_ready(channel) do
      {:ok, channel}
    end
  end

  def rpc_opts, do: [timeout: @timeout]
  def stream_opts, do: [timeout: @stream_timeout]
end
