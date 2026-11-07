defmodule Console.Graphql.Middleware.SingleItem do
  @moduledoc """
  Rejects a field when its parent was resolved as an element of a list (eg a connection's edges),
  for fields too expensive to fetch for every row of a page.
  """
  @behaviour Absinthe.Middleware

  def call(resolution, msg: msg) do
    case Enum.any?(Absinthe.Resolution.path(resolution), &is_integer/1) do
      true -> Absinthe.Resolution.put_result(resolution, {:error, msg})
      _ -> resolution
    end
  end
end
