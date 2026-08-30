defmodule CloudQuery.ClientTest do
  use ExUnit.Case, async: false
  use Mimic

  alias CloudQuery.Client

  test "waits for the supervised gRPC connection to be ready" do
    channel = %GRPC.Channel{}

    expect(GRPC.Client.Connection, :get_channel, fn Client -> {:ok, channel} end)
    expect(GRPC.Client.Connection, :await_ready, fn ^channel -> :ok end)

    assert {:ok, ^channel} = Client.connect()
  end
end
