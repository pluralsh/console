defmodule Console.Schema.PipelineEdge do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Pipeline, PipelineStage, PipelineGate}

  schema "pipeline_edges" do
    field :promoted_at, :utc_datetime_usec

    has_many :gates, PipelineGate, foreign_key: :edge_id, on_replace: :delete

    belongs_to :pipeline, Pipeline
    belongs_to :from,     PipelineStage
    belongs_to :to,       PipelineStage

    timestamps()
  end

  def for_pipeline(query \\ __MODULE__, id) do
    from(e in query, where: e.pipeline_id == ^id)
  end

  def from_stage(query \\ __MODULE__, id) do
    from(e in query, where: e.from_id == ^id)
  end

  def preloaded(query \\ __MODULE__, preloads \\ [:gates, to: [services: [:criteria, :service]]]) do
    from(e in query, preload: ^preloads)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(pipeline_id from_id to_id promoted_at)a)
    |> cast_assoc(:gates)
    |> foreign_key_constraint(:pipeline_id)
    |> foreign_key_constraint(:from_id)
    |> foreign_key_constraint(:to_id)
    |> unique_constraint([:from_id, :to_id])
    |> validate_required(~w(from_id to_id)a)
  end
end
