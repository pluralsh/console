defmodule Console.Schema.ClusterProvider do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, GitRepository}

  schema "cluster_providers" do
    field :name,          :string
    field :namespace,     :string

    embeds_one :git, Service.Git, on_replace: :update
    belongs_to :repository, GitRepository
    belongs_to :service, Service

    timestamps()
  end

  @valid ~w(name namespace repository_id service_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:git)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:repository_id)
    |> unique_constraint(:name)
    |> validate_required([:name])
  end
end
