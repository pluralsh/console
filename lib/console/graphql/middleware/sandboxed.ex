defmodule Console.Middleware.Sandboxed do
  @behaviour Absinthe.Middleware

  def call(resolution, _) do
    case Console.sandbox?() do
      true -> Absinthe.Resolution.put_result(resolution, {:error, "cannot perform this action in a sandbox environment"})
      _ -> resolution
    end
  end
end
