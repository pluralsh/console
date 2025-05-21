defmodule Console.Schema.ClusterInsightComponent do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, AiInsight}

  schema "cluster_insight_components" do
    field :group,     :string
    field :version,   :string
    field :kind,      :string
    field :namespace, :string
    field :name,      :string

    belongs_to :cluster, Cluster
    belongs_to :insight, AiInsight, on_replace: :update

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(cic in query, where: cic.cluster_id == ^cluster_id)
  end

  @valid ~w(group version kind namespace name cluster_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:insight)
    |> foreign_key_constraint(:cluster_id)
    |> validate_required([:kind, :name])
  end
end
