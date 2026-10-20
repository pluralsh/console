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

  test "formats failed kas/http requests" do
    resolution = %Resolution{
      errors: [
        %HTTPoison.Error{reason: :econnrefused},
        {:http_error, 503, %{"kind" => "Status"}},
        {:http_error, 404, %{"message" => "pods \"x\" not found"}},
        {:error, %HTTPoison.Error{reason: :timeout}},
        %Kazan.RemoteError{reason: {:http_error, 403, %{"message" => "forbidden"}}}
      ]
    }

    %Resolution{errors: errors} = ErrorHandler.call(resolution, [])

    assert Enum.sort(errors) == Enum.sort([
      "upstream request failed: :econnrefused",
      "upstream request failed with status 503",
      "pods \"x\" not found",
      "upstream request failed: :timeout",
      "forbidden"
    ])
  end
end
