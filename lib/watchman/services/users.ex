defmodule Watchman.Services.Users do
  use Watchman.Services.Base
  alias Watchman.PubSub
  alias Watchman.Schema.{User, Invite, Group, GroupMember}
  alias Watchman.Repo

  @type user_resp :: {:ok, User.t} | {:error, term}
  @type group_resp :: {:ok, Group.t} | {:error, term}
  @type group_member_resp :: {:ok, GroupMember.t} | {:error, term}

  @spec get_user(binary) :: User.t | nil
  def get_user(id), do: Repo.get(User, id)

  @spec get_user!(binary) :: User.t
  def get_user!(id), do: Repo.get!(User, id)

  @spec get_group!(binary) :: Group.t
  def get_group!(id), do: Repo.get!(Group, id)

  @spec get_group_member!(binary, binary) :: GroupMember.t
  def get_group_member!(group_id, user_id),
    do: Repo.get_by!(GroupMember, user_id: user_id, group_id: group_id)

  @spec get_group_member(binary, binary) :: GroupMember.t
  def get_group_member(group_id, user_id),
    do: Repo.get_by(GroupMember, user_id: user_id, group_id: group_id)

  @spec get_bot!(binary) :: User.t
  def get_bot!(name), do: Repo.get_by!(User, bot_name: name)

  @spec get_user_by_email!(binary) :: User.t
  def get_user_by_email!(email), do: Repo.get_by!(User, email: email)

  @spec get_invite(binary) :: Invite.t | nil
  def get_invite(secure_id), do: Repo.get_by(Invite, secure_id: secure_id)

  @spec get_invite!(binary) :: Invite.t
  def get_invite!(secure_id), do: Repo.get_by!(Invite, secure_id: secure_id)

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