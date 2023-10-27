defmodule Console.Schema.PipelineGate do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PipelineEdge, User, Cluster}

  defenum Type, approval: 0, window: 1, job: 2
  defenum State, pending: 0, open: 1, closed: 2

  schema "pipeline_gates" do
    field :name,  :string
    field :state, State, default: :closed
    field :type,  Type

    belongs_to :cluster,  Cluster
    belongs_to :edge,     PipelineEdge
    belongs_to :approver, User

    timestamps()
  end

  def for_stage(query \\ __MODULE__, stage_id) do
    from(g in query,
      join: e in assoc(g, :edge),
      where: e.from_id == ^stage_id
    )
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(g in query, where: g.cluster_id == ^cluster_id)
  end

  def for_pipeline(query \\ __MODULE__, pipeline_id) do
    from(g in query,
      join: e in assoc(g, :edge),
      where: e.pipeline_id == ^pipeline_id
    )
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(g in query, order_by: ^order)
  end

  @valid ~w(name state type edge_id approver_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:edge_id)
    |> foreign_key_constraint(:approver_id)
    |> validate_required([:name, :state, :type])
  end
end
