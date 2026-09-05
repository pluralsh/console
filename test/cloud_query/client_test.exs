defmodule CloudQuery.ClientTest do
  use ExUnit.Case, async: false
  use Mimic

  alias CloudQuery.Client
  alias CloudQuery.Client.Retry

  test "waits for the supervised gRPC connection to be ready" do
    channel = %GRPC.Channel{}

    expect(GRPC.Client.Connection, :get_channel, fn Client -> {:ok, channel} end)
    expect(GRPC.Client.Connection, :await_ready, fn ^channel -> :ok end)

    assert {:ok, ^channel} = Client.connect()
  end

  test "uses gun with retry interceptors" do
    assert Client.adapter() == GRPC.Client.Adapters.Gun
    assert [{Retry, opts}] = Client.interceptors()
    assert opts[:max] == 3
  end
end

defmodule CloudQuery.Client.RetryTest do
  use ExUnit.Case, async: false
  use Mimic

  alias CloudQuery.Client.Retry

  @closed %GRPC.RPCError{
    status: 2,
    message: "error occurred while receiving data: {:error, \"the connection is closed\"}"
  }
  @unavailable %GRPC.RPCError{status: 14, message: "upstream unavailable"}
  @internal %GRPC.RPCError{status: 13, message: "pq: role \"abc\" does not exist (28000)"}

  test "retries unary RPCs after a closed connection" do
    channel = %GRPC.Channel{ref: :cloud_query_retry}
    stream = %{grpc_type: :unary, channel: channel}
    opts = Retry.init(max: 3, pause: 1, backoff: 1)
    {:ok, agent} = Agent.start_link(fn -> 0 end)

    expect(GRPC.Client.Connection, :resolve_now, fn ^channel -> :ok end)

    next = fn ^stream, :req ->
      count = Agent.get_and_update(agent, fn n -> {n + 1, n + 1} end)
      if count == 1, do: {:error, @closed}, else: {:ok, :recovered}
    end

    assert {:ok, :recovered} = Retry.call(stream, :req, next, opts)
    assert Agent.get(agent, & &1) == 2
  end

  test "does not retry application errors" do
    stream = %{grpc_type: :unary, channel: %GRPC.Channel{}}
    opts = Retry.init(max: 3, pause: 1, backoff: 1)
    {:ok, agent} = Agent.start_link(fn -> 0 end)

    next = fn _stream, :req ->
      Agent.update(agent, &(&1 + 1))
      {:error, @internal}
    end

    assert {:error, @internal} = Retry.call(stream, :req, next, opts)
    assert Agent.get(agent, & &1) == 1
  end

  test "does not retry streaming RPCs" do
    stream = %{grpc_type: :server_stream, channel: %GRPC.Channel{}}
    next = fn _stream, :req -> {:error, @closed} end

    assert {:error, @closed} = Retry.call(stream, :req, next, [])
  end

  test "detects closed and unavailable gRPC failures" do
    assert Retry.disconnect?(@closed)
    assert Retry.disconnect?(@unavailable)
    assert Retry.disconnect?("the connection is closed")
    refute Retry.disconnect?(@internal)
    refute Retry.disconnect?(%GRPC.RPCError{status: 3, message: "invalid argument"})
  end
end
