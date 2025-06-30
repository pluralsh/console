defmodule CloudQuery.Client do
  @moduledoc false

  def connect() do
    host()
    |> GRPC.Stub.connect()
  end

  defp host(), do: "console-cloud-query:9192"
end
