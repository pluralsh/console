defmodule Watchman.Middleware.AdminRequired do
  @behaviour Absinthe.Middleware
  alias Watchman.Schema.User

  def call(%{context: %{current_user: %User{roles: %{admin: true}}}} = res, _config), do: res
  def call(resolution, _) do
    Absinthe.Resolution.put_result(resolution, {:error, "unauthenticated"})
  end
end