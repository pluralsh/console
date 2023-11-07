defmodule Console.Middleware.Rbac do
  @behaviour Absinthe.Middleware
  import Absinthe.Resolution, only: [put_result: 2]
  alias Console.Schema.User
  alias Console.Services.Rbac

  @dummy "!!invalid!!"

  def call(%{context: %{current_user: %User{roles: %{admin: true}}}} = res, _), do: res
  def call(%{context: %{current_user: %User{} = user}} = res, opts) do
    perm = Keyword.get(opts, :perm)
    repo = fetch(res, Map.new(opts))

    case Rbac.validate(user, repo, perm) do
      true -> res
      _ -> put_result(res, {:error, "forbidden"})
    end
  end
  def call(res, _) do
    IO.inspect(res.context)
    put_result(res, {:error, "forbidden"})
  end

  defp fetch(%{source: %{} = source}, %{field: arg}) when is_atom(arg), do: Map.get(source, arg, @dummy)
  defp fetch(%{source: %{} = source}, %{field: [_ | _] = path}), do: Console.deep_get(source, path, @dummy)
  defp fetch(%{arguments: %{} = args}, %{arg: arg}) when is_atom(arg), do: Map.get(args, arg, @dummy)
  defp fetch(%{arguments: %{} = args}, %{arg: [_ | _] = path}), do: get_in(args, path) || @dummy
end
