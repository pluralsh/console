defmodule Watchman.Schema.User do
  use Piazza.Ecto.Schema

  @email_re ~r/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-\.]+\.[a-zA-Z]{2,}$/

  schema "watchman_users" do
    field :name,          :string
    field :email,         :string
    field :bot_name,      :string
    field :password_hash, :string
    field :password,      :string, virtual: true
    field :jwt,           :string, virtual: true
    field :deleted_at,    :utc_datetime_usec

    embeds_one :roles,  Roles, on_replace: :update do
      field :admin, :boolean, default: false
    end

    timestamps()
  end

  def search(query \\ __MODULE__, name) do
    from(u in query,
      where: like(u.name, ^"#{name}%") or like(u.email, ^"#{name}%")
    )
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :email]) do
    from(u in query, order_by: ^order)
  end

  @valid ~w(name email password deleted_at)a

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