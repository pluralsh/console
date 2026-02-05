defmodule Console.AI.Vector.Utils do
  alias Console.Deployments.Settings
  alias Console.Schema.User

  @spec initialized() :: :ok | Console.error
  def initialized() do
    case Settings.vector_store_initialized() do
      {:ok, _} -> :ok
      err -> err
    end
  end

  def vector_authz(_, v) when not is_integer(v) or v < 2, do: []
  def vector_authz(%User{roles: %{admin: true}}, _), do: []
  def vector_authz(%User{} = user, _) do
    user = Console.Services.Rbac.preload(user)
    [user_ids: [user.id], group_ids: group_ids(user)]
  end
  def vector_authz(_, _), do: []

  defp group_ids(%User{groups: [_ | _] = groups}), do: Enum.map(groups, & &1.id)
  defp group_ids(_), do: []
end
