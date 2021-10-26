defmodule Console.Schema.User do
  use Piazza.Ecto.Schema
  alias Console.Schema.{RoleBinding, Group}

  @email_re ~r/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-\.]+\.[a-zA-Z]{2,}$/

  schema "watchman_users" do
    field :name,           :string
    field :email,          :string
    field :bot_name,       :string
    field :password_hash,  :string
    field :profile,        :string
    field :password,       :string, virtual: true
    field :jwt,            :string, virtual: true
    field :deleted_at,     :utc_datetime_usec
    field :read_timestamp, :utc_datetime_usec

    embeds_one :roles,  Roles, on_replace: :update do
      field :admin, :boolean, default: false
    end

    has_many :role_bindings, RoleBinding
    many_to_many :groups, Group, join_through: "group_members"
    has_many :group_role_bindings, through: [:groups, :role_bindings]

    timestamps()
  end

  def roles(%__MODULE__{role_bindings: roles, group_role_bindings: group_roles}) when is_list(roles) and is_list(group_roles),
    do: Enum.map(roles ++ group_roles, & &1.role) |> Enum.uniq_by(& &1.id)
  def roles(_), do: []

  def search(query \\ __MODULE__, name) do
    from(u in query,
      where: like(u.name, ^"#{name}%") or like(u.email, ^"#{name}%")
    )
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :email]) do
    from(u in query, order_by: ^order)
  end

  @valid ~w(name email password deleted_at profile)a
  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:roles, with: &role_changeset/2)
    |> unique_constraint(:email)
    |> unique_constraint(:bot_name)
    |> validate_length(:password, min: 10)
    |> validate_length(:email, max: 255)
    |> validate_format(:email, @email_re)
    |> validate_required([:email, :name])
    |> hash_password()
  end

  def role_changeset(model, attrs) do
    model
    |> cast(attrs, [:admin])
  end

  defp hash_password(%Ecto.Changeset{valid?: true, changes: %{password: password}} = changeset) do
    change(changeset, Argon2.add_hash(password))
  end
  defp hash_password(changeset), do: changeset
end
