defmodule ConsoleWeb.Plugs.NoOp do
  def init(opts), do: opts
  def call(conn, _opts), do: %{conn | path_params: %{}, params: %{}}
end
