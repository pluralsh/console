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

  def changeset(model, attrs \\ %{}, provider) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:provider_id)
    |> backfill_namespace(provider)
    |> validate_required(@valid)
  end

  defp backfill_namespace(cs, provider) do
    name = get_field(cs, :name)
    put_new_change(cs, :namespace, fn -> "plrl-capi-#{provider.name}-#{name}" end)
  end
end
