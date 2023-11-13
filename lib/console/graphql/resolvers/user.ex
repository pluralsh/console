defmodule Console.GraphQl.Resolvers.User do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.User
  alias Console.Schema.{Group, GroupMember, Role, RoleBinding, Notification, AccessToken, AccessTokenAudit}
  alias Console.Services.Users
  require Logger

  def query(Group, _), do: Group
  def query(Role, _), do: Role
  def query(RoleBinding, _), do: RoleBinding
  def query(_, _), do: User

  def login_link(%{key: k}, _) do
    Console.conf(:login_link)
    |> Map.new()
    |> case do
      %{key: ^k, email: email} when is_binary(email) ->
        Users.get_user_by_email(email)
        |> ok()
        |> with_jwt()
      _ -> {:error, "unauthorized"}
    end
  end

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
    |> maybe_search(Role, args)
    |> paginate(args)
  end

  def list_notifications(args, %{context: %{current_user: user}}) do
    Notification.ordered()
    |> filter_unread(args, user)
    |> paginate(args)
  end

  def list_tokens(args, %{context: %{current_user: user}}) do
    AccessToken.for_user(user.id)
    |> AccessToken.ordered()
    |> paginate(args)
  end

  def list_token_audits(args, %{source: %{id: id}}) do
    AccessTokenAudit.for_token(id)
    |> AccessTokenAudit.ordered()
    |> paginate(args)
  end

  defp filter_unread(query, %{all: true}, _), do: query
  defp filter_unread(query, _, user), do: Notification.unread(query, user)

  def login_info(args, _) do
    case Console.conf(:plural_login) do
      true -> {:ok, %{oidc_uri: oidc_uri(args)}}
      false -> {:ok, %{oidc_uri: nil}}
    end
  end

  defp oidc_uri(args) do
    OpenIDConnect.authorization_uri(:plural, hydrate_redirect_uri(%{state: state_token()}, args))
  end

  defp state_token() do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64()
  end

  defp hydrate_redirect_uri(params, %{redirect: uri}) when is_binary(uri),
    do: Map.put(params, :redirect_uri, uri)
  defp hydrate_redirect_uri(params, _), do: params

  def oauth_callback(%{code: code} = args, _) do
    with {:ok, tokens} <- OpenIDConnect.fetch_tokens(:plural, hydrate_redirect_uri(%{code: code}, args)),
         {:ok, claims} <- OpenIDConnect.verify(:plural, tokens["id_token"]) do
      Logger.info "found claims #{inspect(claims)}"

      claims
      |> Map.put("plural_id", claims["sub"])
      |> Users.bootstrap_user()
      |> with_jwt()
    else
      error ->
        Logger.info("Failed to negotiate oauth callback: #{inspect(error)}")
        {:error, :invalid_code}
    end
  end

  defp maybe_search(query, mod, %{q: search}) when is_binary(search), do: mod.search(query, search)
  defp maybe_search(query, _, _), do: query

  def list_group_members(%{group_id: group_id} = args, _) do
    GroupMember.for_group(group_id)
    |> paginate(args)
  end

  def read_notifications(_, %{context: %{current_user: user}}),
    do: Users.mark_read(user)

  def mark_read(args, %{context: %{current_user: user}}),
    do: Users.mark_read(user, Map.get(args, :type, :notification))

  def resolve_role(%{id: role_id}, _), do: {:ok, Users.get_role!(role_id)}

  def resolve_invite(%{id: secure_id}, _),
    do: {:ok, Users.get_invite(secure_id)}

  def resolve_token(%{id: id}, %{context: %{current_user: %{id: user_id}}}) do
    Console.Repo.get!(AccessToken, id)
    |> case do
      %{user_id: ^user_id} = token -> {:ok, token}
      _ -> {:error, "forbidden"}
    end
  end

  def signin_user(%{email: email, password: password}, _) do
    Users.login_user(email, password)
    |> with_jwt()
  end

  def signup_user(%{invite_id: invite_id, attributes: attrs}, _) do
    Users.create_user(attrs, invite_id)
    |> with_jwt()
  end

  def temporary_token(_, %{context: %{current_user: user}}),
    do: Users.temporary_token(user)

  def update_user(%{id: id, attributes: attrs}, %{context: %{current_user: user}})
    when is_binary(id), do: Users.update_user(attrs, id, user)
  def update_user(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Users.update_user(attrs, user)

  def delete_user(%{id: id}, %{context: %{current_user: user}}),
    do: Users.delete_user(id, user)

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

  def create_access_token(_, %{context: %{current_user: user}}),
    do: Users.create_access_token(user)

  def delete_access_token(%{token: token}, %{context: %{current_user: user}}),
    do: Users.delete_access_token(token, user)

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
    with {:ok, token, _} <- Console.Guardian.encode_and_sign(user),
        do: {:ok, %{user | jwt: token}}
  end
  defp with_jwt(error), do: error
end
