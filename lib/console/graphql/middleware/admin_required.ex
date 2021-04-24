defmodule Console.Middleware.AdminRequired do
  @behaviour Absinthe.Middleware
  alias Console.Schema.User

  def call(%{context: %{current_user: %User{roles: %{admin: true}}}} = res, _config), do: res
  def call(resolution, _) do
    Absinthe.Resolution.put_result(resolution, {:error, "unauthenticated"})
  end
end
