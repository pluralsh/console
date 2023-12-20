defmodule Console.Services.Users do
  use Console.Services.Base
  use Nebulex.Caching

  alias Console.PubSub
  alias Console.Schema.{User, Invite, Group, GroupMember, Role, Notification, AccessToken}
  alias Console.Repo

  @cache_adapter Console.conf(:cache_adapter)

  @ttl :timer.minutes(30)

  @type error :: Console.error
  @type user_resp :: {:ok, User.t} | error
  @type group_resp :: {:ok, Group.t} | error
  @type role_resp :: {:ok, Role.t} | error
  @type group_member_resp :: {:ok, GroupMember.t} | error
  @type token_resp :: {:ok, AccessToken.t} | error

  @spec get_user(binary) :: User.t | nil
  def get_user(id), do: Repo.get(User, id)

  @spec get_user!(binary) :: User.t
  def get_user!(id), do: Repo.get!(User, id)

  @decorate cacheable(cache: @cache_adapter, key: :console_bot, opts: [ttl: @ttl])
  def console(), do: Repo.get_by(User, email: "console@plural.sh")

  @decorate cacheable(cache: Console.Cache, key: {:access, token}, opts: [ttl: @ttl])
  def get_by_token(token) do
    Repo.get_by(AccessToken, token: token)
    |> Repo.preload([:user])
    |> case do
      %AccessToken{user: %User{} = user} = token -> %{user | token: token}
      _ -> nil
    end
  end

  def get_user_by_email(email), do: Repo.get_by(User, email: email)

  def get_user_by_email!(email), do: Repo.get_by!(User, email: email)

  @spec get_group!(binary) :: Group.t
  def get_group!(id), do: Repo.get!(Group, id)

  def get_group_by_name(name), do: Repo.get_by(Group, name: name)

  def get_group_by_name!(name), do: Repo.get_by!(Group, name: name)

  @spec get_role!(binary) :: Role.t
  def get_role!(id), do: Repo.get!(Role, id)

  @spec get_group_member!(binary, binary) :: GroupMember.t
  def get_group_member!(group_id, user_id),
    do: Repo.get_by!(GroupMember, user_id: user_id, group_id: group_id)

  @spec get_group_member(binary, binary) :: GroupMember.t
  def get_group_member(group_id, user_id),
    do: Repo.get_by(GroupMember, user_id: user_id, group_id: group_id)

  @spec get_bot!(binary) :: User.t
  def get_bot!(name), do: Repo.get_by!(User, bot_name: name)

  @spec get_invite(binary) :: Invite.t | nil
  def get_invite(secure_id), do: Repo.get_by(Invite, secure_id: secure_id)

  @spec get_invite!(binary) :: Invite.t
  def get_invite!(secure_id), do: Repo.get_by!(Invite, secure_id: secure_id)

  @spec unread_notifications(User.t) :: integer
  def unread_notifications(%User{} = user) do
    Notification.unread(user)
    |> Console.Repo.aggregate(:count)
  end

  @spec create_invite(map) :: {:ok, Invite.t} | {:error, term}
  def create_invite(attrs) do
    %Invite{}
    |> Invite.changeset(attrs)
    |> Repo.insert()
  end

  @spec update_user(map, User.t) :: user_resp
  def update_user(attrs, %User{} = user) do
    user
    |> User.changeset(attrs)
    |> Repo.update()
  end

  def update_user(attrs, user_id, %User{roles: %User.Roles{admin: true}}),
    do: update_user(attrs, get_user!(user_id))
  def update_user(_, _, _), do: {:error, :forbidden}

  @spec create_user(map) :: user_resp
  def create_user(attrs) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
    |> notify(:create)
  end

  @spec delete_user(binary, User.t) :: user_resp
  def delete_user(id, %User{id: id}), do: {:error, "you cannot delete yourself"}
  def delete_user(id, %User{}) do
    case get_user(id) do
      %User{bot_name: "console"} -> {:error, "cannot delete the console user"}
      nil -> {:error, "not found"}
      user -> {:ok, user}
    end
    |> when_ok(:delete)
  end

  @spec bootstrap_user(map) :: user_resp
  def bootstrap_user(%{"email" => email} = attrs) do
    attrs = token_attrs(attrs)
    start_transaction()
    |> add_operation(:user, fn _ ->
      case get_user_by_email(email) do
        %User{} = u ->
          User.changeset(u, attrs)
          |> Repo.update()
        _ -> create_user(attrs)
      end
    end)
    |> hydrate_groups(attrs)
    |> execute(extract: :user)
  end

  @spec create_access_token(User.t) :: token_resp
  def create_access_token(%User{id: id}) do
    %AccessToken{user_id: id}
    |> AccessToken.changeset()
    |> Repo.insert()
  end

  @spec delete_access_token(binary, User.t) :: token_resp
  @decorate cache_evict(cache: Console.Cache, keys: [{:access, token}])
  def delete_access_token(token, %User{id: id}) do
    case Repo.get_by!(AccessToken, token: token) do
      %AccessToken{user_id: ^id} = token -> Repo.delete(token)
      _ -> {:error, "not found"}
    end
  end

  defp token_attrs(%{"admin" => true} = attrs), do: Map.put(attrs, "roles", %{"admin" => true})
  # defp token_attrs(%{"admin" => false} = attrs), do: Map.put(attrs, "roles", %{"admin" => false})
  defp token_attrs(attrs), do: attrs

  def temporary_token(%User{} = user) do
    with {:ok, token, _} <- Console.Guardian.encode_and_sign(user, %{}, ttl: {1, :hour}) do
      handle_notify(PubSub.TemporaryTokenCreated, user)
      {:ok, token}
    end
  end

  defp hydrate_groups(transaction, %{"groups" => [_ | _] = groups}) do
    Enum.uniq(groups)
    |> Enum.reduce(transaction, fn group, xaction ->
      xaction
      |> add_operation({:group, group}, fn _ ->
        case get_group_by_name(group) do
          %Group{} = group -> {:ok, group}
          nil -> create_group(%{name: group, description: "synced from Plural"})
        end
      end)
      |> add_operation({:member, group}, fn %{user: user} = results ->
        group = Map.get(results, {:group, group})
        case get_group_member(group.id, user.id) do
          %GroupMember{} = mem -> {:ok, mem}
          nil -> create_group_member(%{user_id: user.id}, group.id)
        end
      end)
    end)
  end
  defp hydrate_groups(transaction, _), do: transaction

  @spec create_role(map) :: role_resp
  def create_role(attrs) do
    %Role{}
    |> Role.changeset(attrs)
    |> Repo.insert()
  end

  @spec update_role(map, binary) :: role_resp
  def update_role(attrs, id) do
    get_role!(id)
    |> Repo.preload([:role_bindings])
    |> Role.changeset(attrs)
    |> Repo.update()
  end

  @spec delete_role(binary) :: role_resp
  def delete_role(id) do
    get_role!(id)
    |> Repo.delete()
  end

  @spec create_group(map) :: group_resp
  def create_group(attrs) do
    %Group{}
    |> Group.changeset(attrs)
    |> Repo.insert()
  end

  @spec delete_group(binary) :: group_resp
  def delete_group(group_id) do
    get_group!(group_id)
    |> Repo.delete()
  end

  @spec update_group(map, binary) :: group_resp
  def update_group(attrs, group_id) do
    get_group!(group_id)
    |> Group.changeset(attrs)
    |> Repo.update()
  end

  @spec create_group_member(map, binary) :: group_member_resp
  def create_group_member(attrs, group_id) do
    %GroupMember{group_id: group_id}
    |> GroupMember.changeset(attrs)
    |> Repo.insert()
  end

  @spec delete_group_member(binary, binary) :: group_member_resp
  def delete_group_member(group_id, user_id) do
    get_group_member!(group_id, user_id)
    |> Repo.delete()
  end

  @spec create_user(map, binary | Invite.t) :: user_resp
  def create_user(attrs, %Invite{email: email}),
    do: Map.put(attrs, :email, email) |> create_user()
  def create_user(attrs, invite_id) when is_binary(invite_id),
    do: create_user(attrs, get_invite!(invite_id))

  @spec disable_user(binary, boolean, User.t) :: user_resp
  def disable_user(user_id, disable, %User{}) do
    get_user!(user_id)
    |> User.changeset(%{deleted_at: (if disable, do: Timex.now(), else: nil)})
    |> Repo.update()
  end

  @spec login_user(binary, binary) :: user_resp
  def login_user(email, password) do
    get_user_by_email!(email)
    |> validate_password(password)
  end

  @spec mark_read(User.t, :read | :build) :: user_resp
  def mark_read(%User{} = user, type \\ :read) do
    key = read_timestamp(type)
    Ecto.Changeset.change(user, %{key => Timex.now()})
    |> Repo.update()
  end

  defp read_timestamp(:build), do: :build_timestamp
  defp read_timestamp(_), do: :read_timestamp

  defp validate_password(%User{deleted_at: nil} = user, pwd) do
    case Argon2.check_pass(user, pwd) do
      {:ok, user} -> {:ok, user}
      _ -> {:error, :invalid_password}
    end
  end
  defp validate_password(_, _), do: {:error, :disabled_user}

  defp notify({:ok, %User{} = user}, :create),
    do: handle_notify(PubSub.UserCreated, user)
  defp notify(error, _), do: error
end
