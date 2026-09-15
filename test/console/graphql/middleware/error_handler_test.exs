defmodule Console.Middleware.ErrorHandlerTest do
  use ExUnit.Case, async: true

  alias Absinthe.Resolution
  alias Console.Middleware.ErrorHandler

  test "formats gRPC errors without requiring String.Chars" do
    resolution = %Resolution{
      errors: [%GRPC.RPCError{status: 3, message: "time range is required"}]
    }

    assert %Resolution{errors: ["time range is required"]} =
             ErrorHandler.call(resolution, [])
  end
end
