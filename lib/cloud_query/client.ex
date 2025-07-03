defmodule CloudQuery.Client do
  @moduledoc false

  def connect() do
    host()
    |> GRPC.Stub.connect()
  end

  defp host(), do: Console.conf(:cloudquery_host)
end
