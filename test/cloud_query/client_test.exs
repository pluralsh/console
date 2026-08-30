defmodule CloudQuery.ClientTest do
  use ExUnit.Case, async: false

  alias CloudQuery.Client

  setup do
    {:ok, _} = Application.ensure_all_started(:grpc)

    case Client.connect() do
      {:ok, _channel} -> :ok
      {:error, :not_started} -> start_supervised!(Client)
    end

    :ok
  end

  test "uses a supervised named gRPC connection" do
    assert %{id: {GRPC.Client.Connection, Client}, restart: :transient} = Client.child_spec([])
    assert {:ok, %GRPC.Channel{}} = Client.connect()
  end
end
