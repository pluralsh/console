defmodule Console.Schema.ScmConnection do
  use Piazza.Ecto.Schema

  defenum Type, github: 0, gitlab: 1

  schema "scm_connections" do
    field :name,     :string
    field :type,     Type
    field :base_url, :string
    field :api_url,  :string
    field :username, :string
    field :token,    Piazza.Ecto.EncryptedString
    field :dir,      :string, virtual: true
    field :author,   :map, virtual: true
    field :branch,   :string, virtual: true

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(scm in query, order_by: ^order)
  end

  @valid ~w(name type base_url api_url username token)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:name)
    |> validate_required([:name, :type, :token])
  end
end
