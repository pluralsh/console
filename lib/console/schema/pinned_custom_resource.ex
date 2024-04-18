defmodule Console.Schema.PinnedCustomResource do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster}

  schema "pinned_custom_resources" do
    field :kind,         :string
    field :group,        :string
    field :version,      :string
    field :name,         :string
    field :display_name, :string
    field :namespaced,   :boolean

    belongs_to :cluster, Cluster

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(pc in query, where: pc.cluster_id == ^cluster_id or is_nil(pc.cluster_id))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :display_name]) do
    from(pc in query, order_by: ^order)
  end

  @valid ~w(kind group version name display_name namespaced)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [:cluster_id | @valid])
    |> foreign_key_constraint(:cluster_id)
    |> unique_constraint([:name, :cluster_id])
    |> validate_required(@valid)
  end
end
