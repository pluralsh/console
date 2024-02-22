defmodule Console.Middleware.CheckNamespace do
  @behaviour Absinthe.Middleware
  alias Console.Schema.{Service}

  def call(%{arguments: args, context: %{service: %Service{} = service}} = res, _config) do
    case check_namespace(args, service) do
      true -> res
      false -> Absinthe.Resolution.put_result(res, {:error, "unauthenticated"})
    end
  end
  def call(res, _), do: res

  defp check_namespace(%{namespace: ns}, %Service{namespace: ns}), do: true
  defp check_namespace(%{namespace: n}, _) when is_binary(n), do: false
  defp check_namespace(_, _), do: true
end
