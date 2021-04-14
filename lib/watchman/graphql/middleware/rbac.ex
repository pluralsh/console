defmodule Watchman.Middleware.Rbac do
  @behaviour Absinthe.Middleware
  import Absinthe.Resolution, only: [put_result: 2]
  alias Watchman.Schema.User
  alias Watchman.Services.Rbac

  @dummy "!!invalid!!"

  def call(%{context: %{current_user: %User{roles: %{admin: true}}}} = res, _), do: res
  def call(%{arguments: args, context: %{current_user: %User{} = user}} = res, opts) do
    perm = Keyword.get(opts, :perm)
    arg  = Keyword.get(opts, :arg)
    repo = arg_fetch(args, arg)

    case Rbac.validate(user, repo, perm) do
      true -> res
      _ -> put_result(res, {:error, "forbidden"})
    end
  end

  defp arg_fetch(%{} = args, arg) when is_atom(arg), do: Map.get(args, arg, @dummy)
  defp arg_fetch(%{} = args, [_ | _] = path), do: get_in(args, path) || @dummy
end
