defmodule Console.Middleware.AdminRequired do
  @behaviour Absinthe.Middleware
  alias Console.Schema.User

  def call(%{context: %{current_user: %User{roles: %{admin: true}}}} = res, _config), do: res
  def call(resolution, _) do
    Absinthe.Resolution.put_result(resolution, {:error, "you must be an admin to perform this action"})
  end
end
