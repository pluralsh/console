defmodule Console.Schema.ClusterInsightComponent do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, AiInsight, Service}

  @expiry [hours: -4]

  defenum Priority, low: 1, medium: 2, high: 3, critical: 4

  schema "cluster_insight_components" do
    field :group,     :string
    field :version,   :string
    field :kind,      :string
    field :namespace, :string
    field :name,      :string
    field :priority,  Priority

    belongs_to :cluster, Cluster
    belongs_to :service, Service
    belongs_to :insight, AiInsight, on_replace: :update

    timestamps()
  end

  # A component that stays in the agent's pings is not touched, so it can only be told apart from a stale one by its cluster:
  # components leave a cluster's list with the ping that no longer reports them, the ones that are left are those of clusters that went quiet.
  def expired(query \\ __MODULE__) do
    expiry = Timex.now() |> Timex.shift(@expiry)
    from(cic in query,
      join: c in assoc(cic, :cluster),
      where: coalesce(c.pinged_at, c.inserted_at) < ^expiry
    )
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(cic in query, where: cic.cluster_id == ^cluster_id)
  end

  @valid ~w(group version kind namespace name priority cluster_id service_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:insight)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> validate_required([:kind, :name])
  end
end
