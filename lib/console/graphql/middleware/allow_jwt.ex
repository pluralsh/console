defmodule Console.Middleware.AllowJwt do
  @behaviour Absinthe.Middleware
  alias Console.Schema.User

  def call(%{context: ctx} = res, _config), do: %{res | context: Map.put(ctx, :allow_jwt, true)}
end
