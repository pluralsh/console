defmodule Console.Services.Users do
  use Console.Services.Base
  import Console.Policies.Users, only: [allow: 3]
  use Nebulex.Caching

  alias Console.PubSub
  alias Console.Schema.{
    User,
    Invite,
    Group,
    GroupMember,
    Role,
    Notification,
    AccessToken,
    BootstrapToken,
    Persona,
    RefreshToken,
    ChatSequence
  }
  alias Console.Repo

  @cache_adapter Console.conf(:cache_adapter)

  @ttl :timer.minutes(30)

  @type error :: Console.error
  @type user_resp :: {:ok, User.t} | error
  @type group_resp :: {:ok, Group.t} | error
  @type role_resp :: {:ok, Role.t} | error
  @type group_member_resp :: {:ok, GroupMember.t} | error
  @type token_resp :: {:ok, AccessToken.t} | error
  @type bootstrap_token_resp :: {:ok, BootstrapToken.t} | error
  @type persona_resp :: {:ok, Persona.t} | error
  @type refresh_token_resp :: {:ok, RefreshToken.t} | error

  @spec get_user(binary) :: User.t | nil
  def get_user(id), do: Repo.get(User, id)

  @spec get_user!(binary) :: User.t
  def get_user!(id), do: Repo.get!(User, id)

  @spec get_persona(binary) :: Persona.t | nil
  def get_persona(id), do: Repo.get(Persona, id)

  @spec get_refresh_token(binary) :: RefreshToken.t | nil
  def get_refresh_token(token), do: Repo.get_by(RefreshToken, token: token)

  @decorate cacheable(cache: @cache_adapter, key: :console_bot, opts: [ttl: @ttl])
  def console(), do: Repo.get_by(User, email: "console@plural.sh")

  @decorate cacheable(cache: Console.Cache, key: {:access, token}, opts: [ttl: @ttl])
  def get_by_token(token) do
    Repo.get_by(AccessToken, token: token)
    |> Repo.preload([:user])
    |> case do
      %AccessToken{user: %User{} = user, scopes: scopes} = token -> %{user | token: token, scopes: scopes}
      _ -> nil
    end
  end

  @decorate cacheable(cache: Console.Cache, key: {:bootstrap, token}, opts: [ttl: @ttl])
  def get_by_bootstrap_token(token) do
    Repo.get_by(BootstrapToken, token: token)
    |> Repo.preload([:user])
    |> case do
      %BootstrapToken{user: %User{} = user} = token -> %{user | bootstrap: token}
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
    |> allow(user, :update)
    |> when_ok(:update)
  end

  def update_user(attrs, user_id, %User{} = user) do
    get_user!(user_id)
    |> User.changeset(attrs)
    |> allow(user, :update)
    |> when_ok(:update)
  end

  def upsert_user(%{email: email} = attrs, %User{} = user) when is_binary(email) do
    case get_user_by_email(email) do
      %User{id: id} -> update_user(attrs, id, user)
      nil -> create_user(attrs)
    end
  end
  def upsert_user(_, _), do: {:error, "email is required to upsert"}

  @spec create_user(map) :: user_resp
  def create_user(attrs) do
    start_transaction()
    |> add_operation(:user, fn _ ->
      %User{}
      |> User.changeset(attrs)
      |> Repo.insert()
    end)
    |> add_refresh_token()
    |> execute(extract: :hydrated)
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
    with {:ok, sanitized_email} <- sanitize_email(email) do
      attrs = token_attrs(attrs)
              |> Map.put("email", sanitized_email)
      groups = Map.new(attrs, fn {k, v} -> {String.downcase(k), v} end)
               |> group_attrs()
      start_transaction()
      |> add_operation(:user, fn _ ->
        case get_user_by_email(sanitized_email) do
          %User{} = u ->
            User.changeset(u, attrs)
            |> Repo.update()
          _ -> create_user(attrs)
        end
      end)
      |> hydrate_groups(groups)
      |> add_refresh_token()
      |> execute(extract: :hydrated)
    end
  end

  def bootstrap_user(%{"emails" => [email | _]} = attrs) do
    Map.put(attrs, "email", email)
    |> bootstrap_user()
  end

  def bootstrap_user(_), do: {:error, "Failed to bootstrap user, likely missing email claim in oidc id token"}

  defp sanitize_email(email) do
    case Application.get_env(:console, :org_email_suffix) do
      suffix when is_binary(suffix) and suffix != "" ->
        {:ok, String.replace(email, suffix, "")}
      _ ->
        {:ok, email}
    end
  end

  def backfill_chats() do
    Repo.all(User)
    |> Enum.map(fn %User{id: id} -> %ChatSequence{user_id: id} end)
    |> Enum.map(&ChatSequence.changeset/1)
    |> Enum.each(&Repo.insert!/1)
  end

  @spec create_refresh_token(User.t) :: refresh_token_resp
  def create_refresh_token(%User{id: user_id}) do
    %RefreshToken{user_id: user_id}
    |> RefreshToken.changeset()
    |> Repo.insert()
  end

  defp add_refresh_token(xact) do
    add_operation(xact, :refresh, fn %{user: user} -> create_refresh_token(user) end)
    |> add_operation(:hydrated, fn %{refresh: token, user: user} ->
      {:ok, %{user | refresh_token: token}}
    end)
  end

  @doc """
  Determines if a user can refresh their jwt and returns the user back if so
  """
  @spec authorize_refresh(binary) :: user_resp
  def authorize_refresh(token) do
    get_refresh_token(token)
    |> Repo.preload([:user])
    |> case do
      %RefreshToken{user: user} -> {:ok, user}
      _ -> {:error, "could not fetch refresh token"}
    end
  end

  def create_service_account(attrs) do
    %User{service_account: true}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  def update_service_account(attrs, id) do
    get_user!(id)
    |> Repo.preload([:assume_bindings])
    |> User.changeset(attrs)
    |> Repo.update()
  end

  @spec add_github_team_member(binary, binary, binary) :: group_member_resp
  def add_github_team_member(email, org, team) do
    group = "#{org}:#{team}"
    start_transaction()
    |> add_operation(:user, fn _ ->
      case get_user_by_email(email) do
        %User{} = u -> {:ok, u}
        _ -> {:error, "user not found"}
      end
    end)
    |> add_operation(:group, fn _ ->
      case get_group_by_name(group) do
        %Group{} = group -> {:ok, group}
        nil -> {:error, "group #{group} not found"}
      end
    end)
    |> add_operation(:member, fn %{user: u, group: g} ->
      case get_group_member(g.id, u.id) do
        %GroupMember{} = m -> {:ok, m}
        nil -> create_group_member(%{user_id: u.id}, g.id)
      end
    end)
    |> execute(extract: :member)
  end

  @spec create_access_token(User.t) :: token_resp
  def create_access_token(args \\ %{}, %User{id: id}) do
    %AccessToken{user_id: id}
    |> AccessToken.changeset(args)
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

  @spec delete_access_token_by_id(binary, User.t) :: token_resp
  def delete_access_token_by_id(id, user) do
    case Repo.get(AccessToken, id) do
      %AccessToken{token: token} -> delete_access_token(token, user)
      _ -> {:error, "not found"}
    end
  end

  defp group_attrs(%{"groups" => [_ | _] = groups}), do: groups
  defp group_attrs(%{"adgroups" => [_ | _] = groups}), do: groups
  defp group_attrs(%{"groups" => group}) when is_binary(group), do: [group]
  defp group_attrs(%{"adgroups" => group}) when is_binary(group), do: [group]
  defp group_attrs(_), do: []

  defp token_attrs(%{"admin" => true} = attrs), do: Map.put(attrs, "roles", %{"admin" => true})
  # defp token_attrs(%{"admin" => false} = attrs), do: Map.put(attrs, "roles", %{"admin" => false})
  defp token_attrs(attrs), do: maybe_admin(attrs)

  defp maybe_admin(%{"email" => email} = attrs) do
    Console.conf(:admin_emails)
    |> Enum.member?(email)
    |> case do
      true -> Map.put(attrs, "roles", %{"admin" => true})
      _ -> attrs
    end
  end
  defp maybe_admin(attrs), do: attrs

  @spec create_bootstrap_token(map, User.t) :: bootstrap_token_resp
  def create_bootstrap_token(attrs, %User{id: id} = user) do
    %BootstrapToken{user_id: id}
    |> BootstrapToken.changeset(Map.put_new(attrs, :user_id, id))
    |> allow(user, :write)
    |> when_ok(:insert)
  end

  @spec delete_bootstrap_token(binary, User.t) :: bootstrap_token_resp
  def delete_bootstrap_token(id, %User{} = user) do
    Repo.get(BootstrapToken, id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  def temporary_token(%User{} = user) do
    with {:ok, token, _} <- Console.Guardian.encode_and_sign(user, %{}, ttl: {1, :hour}) do
      handle_notify(PubSub.TemporaryTokenCreated, user)
      {:ok, token}
    end
  end

  defp hydrate_groups(transaction, [_ | _] = groups) do
    Enum.uniq(groups)
    |> Enum.reduce(transaction, fn group, xaction ->
      xaction
      |> add_operation({:group, group}, fn _ ->
        case get_group_by_name(group) do
          %Group{} = group -> {:ok, group}
          nil -> create_group(%{name: group, description: "synced from your OpenId Connect provider by Plural"})
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

  def upsert_group(name) do
    case get_group_by_name(name) do
      %Group{} = group -> {:ok, group}
      nil -> create_group(%{name: name, description: "set up for you by Plural"})
    end
  end

  @spec create_group(map) :: group_resp
  def create_group(attrs) do
    start_transaction()
    |> add_operation(:group, fn _ ->
      %Group{}
      |> Group.changeset(attrs)
      |> Repo.insert()
    end)
    |> add_operation(:members, fn
      %{group: %Group{id: id, global: true}} ->
        members = Repo.all(User)
                 |> Enum.map(&timestamped(%{user_id: &1.id, group_id: id}))

        Repo.insert_all(GroupMember, members)
        |> ok()
      _ -> {:ok, []}
    end)
    |> execute(extract: :group)
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
  def create_group_member(%{user_id: user_id} = attrs, group_id) do
    case get_group_member(group_id, user_id) do
      nil -> %GroupMember{group_id: group_id, user_id: user_id}
      %GroupMember{} = gm -> gm
    end
    |> GroupMember.changeset(attrs)
    |> Repo.insert_or_update()
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

  @spec create_persona(map) :: persona_resp
  def create_persona(attrs) do
    %Persona{}
    |> Persona.changeset(attrs)
    |> Repo.insert()
  end

  @spec update_persona(map, binary) :: persona_resp
  def update_persona(attrs, id) do
    Repo.get(Persona, id)
    |> Repo.preload([:bindings])
    |> Persona.changeset(attrs)
    |> Repo.update()
  end

  @spec delete_persona(binary) :: persona_resp
  def delete_persona(id) do
    Repo.get(Persona, id)
    |> Repo.delete()
  end

  @spec disable_user(binary, boolean, User.t) :: user_resp
  def disable_user(user_id, disable, %User{}) do
    get_user!(user_id)
    |> User.changeset(%{deleted_at: (if disable, do: Timex.now(), else: nil)})
    |> Repo.update()
  end

  @spec login_user(binary, binary) :: user_resp
  def login_user(email, password) do
    start_transaction()
    |> add_operation(:user, fn _ ->
      get_user_by_email!(email)
      |> validate_password(password)
    end)
    |> add_refresh_token()
    |> execute(extract: :hydrated)
  end

  @doc """
  Marks a list of user ids as having been digested
  """
  @spec digested([binary]) :: {integer, any}
  def digested(user_ids) do
    User.for_ids(user_ids)
    |> Repo.update_all(set: [last_digest_at: Timex.now()])
  end

  @doc """
  Wipes all active refresh tokens for the given user
  """
  @spec logout_user(User.t) :: user_resp
  def logout_user(%User{} = user) do
    RefreshToken.for_user(user.id)
    |> Repo.delete_all()
    {:ok, user}
  end

  @doc """
  Determines if a service account can be assumed by the acting user
  """
  @spec impersonate_service_account(User.t | binary, User.t) :: user_resp
  def impersonate_service_account(%User{} = sa, %User{} = user),
    do: Console.Deployments.Policies.allow(sa, user, :assume)
  def impersonate_service_account(email, %User{} = user) when is_binary(email) do
    get_user_by_email!(email)
    |> impersonate_service_account(user)
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
    case Argon2.verify_pass(pwd, user.password_hash) do
      true -> {:ok, user}
      _ -> {:error, :invalid_password}
    end
  end
  defp validate_password(_, _), do: {:error, :disabled_user}

  defp notify({:ok, %User{} = user}, :create),
    do: handle_notify(PubSub.UserCreated, user)
  defp notify(error, _), do: error
end
