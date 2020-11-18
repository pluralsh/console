defmodule Watchman.GraphQl.Resolvers.User do
  use Watchman.GraphQl.Resolvers.Base, model: Watchman.Schema.User
  alias Watchman.Schema.{Group, GroupMember, Role, RoleBinding}
  alias Watchman.Services.Users

  def query(Group, _), do: Group
  def query(Role, _), do: Role
  def query(RoleBinding, _), do: RoleBinding
  def query(_, _), do: User

  def list_users(args, _) do
    User.ordered()
    |> maybe_search(User, args)
    |> paginate(args)
  end

  def list_groups(args, _) do
    Group.ordered()
    |> maybe_search(Group, args)
    |> paginate(args)
  end

  def list_roles(args, _) do
    Role.ordered()
    |> paginate(args)
  end

  defp maybe_search(query, mod, %{q: search}) when is_binary(search), do: mod.search(query, search)
  defp maybe_search(query, _, _), do: query

  def list_group_members(%{group_id: group_id} = args, _) do
    GroupMember.for_group(group_id)
    |> paginate(args)
  end

  def resolve_role(%{id: role_id}, _), do: {:ok, Users.get_role!(role_id)}

  def resolve_invite(%{id: secure_id}, _) do
    {:ok, Users.get_invite(secure_id)}
  end

  def signin_user(%{email: email, password: password}, _) do
    Users.login_user(email, password)
    |> with_jwt()
  end

  def signup_user(%{invite_id: invite_id, attributes: attrs}, _) do
    Users.create_user(attrs, invite_id)
    |> with_jwt()
  end

  def update_user(%{id: id, attributes: attrs}, %{context: %{current_user: user}})
    when is_binary(id), do: Users.update_user(attrs, id, user)
  def update_user(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Users.update_user(attrs, user)

  def create_invite(%{attributes: attrs}, _),
    do: Users.create_invite(attrs)

  def create_group(%{attributes: attrs}, _),
    do: Users.create_group(attrs)

  def delete_group(%{group_id: group_id}, _),
    do: Users.delete_group(group_id)

  def update_group(%{attributes: attrs, group_id: group_id}, _),
    do: Users.update_group(attrs, group_id)

  def create_group_member(%{group_id: group_id, user_id: user_id}, _),
    do: Users.create_group_member(%{user_id: user_id}, group_id)

  def delete_group_member(%{group_id: group_id, user_id: user_id}, _),
    do: Users.delete_group_member(group_id, user_id)

  def create_role(%{attributes: attrs}, _) do
    with_permissions(attrs)
    |> Users.create_role()
  end

  def update_role(%{attributes: attrs, id: id}, _) do
    with_permissions(attrs)
    |> Users.update_role(id)
  end

  def delete_role(%{id: id}, _), do: Users.delete_role(id)

  defp with_permissions(%{permissions: perms} = attrs) when is_list(perms) do
    perm_set = MapSet.new(perms)
    permissions = Role.permissions() |> Enum.map(& {&1, MapSet.member?(perm_set, &1)}) |> Enum.into(%{})
    Map.put(attrs, :permissions, permissions)
  end
  defp with_permissions(attrs), do: attrs

  @colors ~w(#6b5b95 #d64161 #ff7b25 #103A50 #CDCCC2 #FDC401 #8E5B3C #020001 #2F415B)

  def background_color(%{id: id}) do
    stripped = String.replace(id, "-", "")
    {integral, _} = Integer.parse(stripped, 16)
    {:ok, Enum.at(@colors, rem(integral, length(@colors)))}
  end

  defp with_jwt({:ok, user}) do
    with {:ok, token, _} <- Watchman.Guardian.encode_and_sign(user),
        do: {:ok, %{user | jwt: token}}
  end
  defp with_jwt(error), do: error
end