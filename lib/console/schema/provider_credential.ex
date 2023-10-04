defmodule Console.Schema.ProviderCredential do
  use Piazza.Ecto.Schema
  alias Console.Schema.{ClusterProvider}

  schema "provider_credentials" do
    field :name,      :string
    field :namespace, :string
    field :kind,      :string

    belongs_to :provider, ClusterProvider

    timestamps()
  end

  @valid ~w(provider_id name namespace kind)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:provider_id)
    |> validate_required(@valid)
  end
end
