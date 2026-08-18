defmodule Console.Graphql.Middleware.Nested do
  @behaviour Absinthe.Middleware

  @enforce_key :nested_enforce

  def call(%{context: context} = resolution, enforce: true),
    do: %{resolution | context: Map.put(context, @enforce_key, true)}

  def call(%{context: context} = resolution, check: true, msg: msg) do
    case Map.get(context, @enforce_key) do
      true -> Absinthe.Resolution.put_result(resolution, {:error, msg})
      _ -> resolution
    end
  end

  def call(resolution, _), do: resolution
end
