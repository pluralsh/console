defmodule Console.Schema.User do
  use Piazza.Ecto.Schema
  alias Console.Schema.{
    RoleBinding,
    Group,
    AccessToken,
    BootstrapToken,
    PolicyBinding,
    GroupMember,
    Chat
  }

  @email_re ~r/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-\.]+\.[a-zA-Z]{2,}$/

  schema "watchman_users" do
    field :name,             :string
    field :email,            :string
    field :bot_name,         :string
    field :password_hash,    :string
    field :profile,          :string
    field :plural_id,        :string
    field :password,         :string, virtual: true
    field :jwt,              :string, virtual: true
    field :refresh_token,    :string, virtual: true
    field :service_account,  :boolean
    field :deleted_at,       :utc_datetime_usec
    field :read_timestamp,   :utc_datetime_usec
    field :build_timestamp,  :utc_datetime_usec
    field :assume_policy_id, :binary_id
    field :scopes,           :map, virtual: true
    field :api,              :string, virtual: true
    field :roles_updated,    :boolean, virtual: true, default: false

    field :last_digest_at,   :utc_datetime_usec

    field :signing_private_key, Piazza.Ecto.EncryptedString

    has_many :assume_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :assume_policy_id

    embeds_one :roles,  Roles, on_replace: :update do
      field :admin, :boolean, default: false
    end

    embeds_one :email_settings, EmailSettings, on_replace: :update do
      field :digest, :boolean, default: true
    end

    has_many :role_bindings, RoleBinding
    many_to_many :groups, Group, join_through: "group_members"

    has_many :group_members, GroupMember
    has_one :token,          AccessToken
    has_one :bootstrap,      BootstrapToken
    has_many :group_role_bindings, through: [:groups, :role_bindings]

    timestamps()
  end

  def service_account(query \\ __MODULE__) do
    from(u in query, where: u.service_account)
  end

  def with_emails(query \\ __MODULE__, emails) do
    from(u in query, where: u.email in ^emails)
  end

  def with_chats(query \\ __MODULE__) do
    from(u in query,
      left_join: c in Chat,
        on: c.user_id == u.id,
      where: not is_nil(c.id),
      distinct: true
    )
  end

  def with_expired_chats(query \\ __MODULE__) do
    from(u in query,
      left_join: c in ^Chat.expired(),
        on: c.user_id == u.id,
      where: not is_nil(c.id),
      distinct: true
    )
  end

  def roles(%__MODULE__{role_bindings: roles, group_role_bindings: group_roles}) when is_list(roles) and is_list(group_roles),
    do: Enum.map(roles ++ group_roles, & &1.role) |> Enum.uniq_by(& &1.id)
  def roles(_), do: []

  def search(query \\ __MODULE__, name) do
    from(u in query,
      where: ilike(u.name, ^"%#{name}%") or like(u.email, ^"#{name}%")
    )
  end

  def for_bindings(query \\ __MODULE__, bindings) do
    base = from(u in query, left_join: gm in assoc(u, :group_members), as: :gm, distinct: true)

    Enum.reduce(bindings, base, fn
      %{group_id: id}, q when is_binary(id) ->
        from([u, gm: gm] in q, or_where: gm.group_id == ^id)
      %{user_id: id}, q when is_binary(id) ->
        from([u, gm: _] in q, or_where: u.id == ^id)
      _, q -> q
    end)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :email]) do
    from(u in query, order_by: ^order)
  end

  @valid ~w(name email password deleted_at profile plural_id service_account signing_private_key)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> infer_name()
    |> cast_assoc(:assume_bindings)
    |> cast_embed(:roles, with: &role_changeset/2)
    |> cast_embed(:email_settings, with: &settings_changeset/2)
    |> unique_constraint(:email)
    |> unique_constraint(:bot_name)
    |> validate_length(:password, min: 10)
    |> validate_length(:email, max: 255)
    |> validate_format(:email, @email_re)
    |> validate_required([:email, :name])
    |> put_new_change(:assume_policy_id, &Ecto.UUID.generate/0)
    |> change_markers(roles: :roles_updated)
    |> hash_password()
  end

  def role_changeset(model, attrs) do
    model
    |> cast(attrs, [:admin])
  end

  def settings_changeset(model, attrs) do
    model
    |> cast(attrs, [:digest])
  end

  defp hash_password(%Ecto.Changeset{valid?: true, changes: %{password: password}} = changeset) do
    put_change(changeset, :password_hash, Argon2.hash_pwd_salt(password))
  end
  defp hash_password(changeset), do: changeset

  defp infer_name(changeset) do
    case {get_field(changeset, :name), get_field(changeset, :email)} do
      {nil, email} -> put_change(changeset, :name, email)
      _ -> changeset
    end
  end
end
