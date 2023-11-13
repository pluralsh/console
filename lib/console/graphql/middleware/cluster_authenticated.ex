defmodule Console.Middleware.ClusterAuthenticated do
  @behaviour Absinthe.Middleware
  alias Console.Schema.Cluster

  def call(%{context: %{cluster: %Cluster{}}} = res, _config), do: res
  def call(resolution, _) do
    Absinthe.Resolution.put_result(resolution, {:error, "unauthenticated"})
  end
end
