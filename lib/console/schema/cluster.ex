defmodule Console.Schema.Cluster do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, ClusterNodePool, NamespacedName, ClusterProvider}

  defenum Provider, aws: 0, azure: 1, gcp: 2

  schema "clusters" do
    field :name,            :string
    field :self,            :boolean

    field :version,         :string
    field :current_version, :string
    field :deploy_token,    :string
    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id
    field :deleted_at,      :utc_datetime_usec

    embeds_one :resource,   NamespacedName
    embeds_one :kubeconfig, NamespacedName

    belongs_to :provider, ClusterProvider
    belongs_to :service,  Service
    has_many :node_pools, ClusterNodePool

    timestamps()
  end

  def for_provider(query \\ __MODULE__, provider_id) do
    from(c in query, where: c.provider_id == ^provider_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(c in query, order_by: ^order)
  end

  @valid ~w(provider_id self version current_version name)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:kubeconfig)
    |> cast_embed(:resource)
    |> cast_assoc(:node_pools)
    |> foreign_key_constraint(:provider_id)
    |> put_new_change(:deploy_token, fn -> "deploy-#{Console.rand_alphanum(20)}" end)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> validate_required(~w(name version)a)
  end
end
