defmodule Console.Middleware.VectorStoreEnabled do
  @behaviour Absinthe.Middleware
  alias Console.AI.VectorStore

  @error "Vector store is not enabled, cannot query"

  def call(resolution, _) do
    case VectorStore.enabled?() do
      true -> resolution
      false -> Absinthe.Resolution.put_result(resolution, {:error, @error})
    end
  end
end
