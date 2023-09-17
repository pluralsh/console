defmodule Console.Middleware.Authenticated do
  @behaviour Absinthe.Middleware
  alias Console.Schema.{User, Cluster}

  def call(%{context: %{cluster: %Cluster{}}} = res, :cluster), do: res
  def call(%{context: %{current_user: %User{}}} = res, _config), do: res
  def call(resolution, _) do
    Absinthe.Resolution.put_result(resolution, {:error, "unauthenticated"})
  end
end
