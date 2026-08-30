defmodule CloudQuery.ClientTest do
  use ExUnit.Case, async: false
  use Mimic

  alias CloudQuery.Client

  test "retries when the gRPC client supervisor disappears during connection cleanup" do
    expect(GRPC.Stub, :connect, 2, fn _ ->
      case Process.get(:grpc_connect_attempt) do
        nil ->
          Process.put(:grpc_connect_attempt, :retry)
          exit({:noproc, {GenServer, :call, [GRPC.Client.Supervisor, {:terminate_child, self()}, :infinity]}})
        :retry -> {:ok, :channel}
      end
    end)

    assert {:ok, :channel} = Client.connect()
  end
end
