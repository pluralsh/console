defmodule Console.Middleware.Feature do
  @behaviour Absinthe.Middleware
  alias Console.Features

  def call(resolution, feature) do
    case Features.available?(feature) do
      true -> resolution
      _ -> Absinthe.Resolution.put_result(resolution, {:error, "you don't have the #{feature} feature enabled"})
    end
  end
end
