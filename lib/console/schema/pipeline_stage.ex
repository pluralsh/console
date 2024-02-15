defmodule Console.Schema.PipelineStage do
  use Piazza.Ecto.Schema
  alias Console.Schema.{
    Pipeline,
    StageService,
    PipelinePromotion,
    PipelineEdge,
    PipelineContext,
  }

  schema "pipeline_stages" do
    field :name,               :string
    field :cursor,             :binary_id
    field :last_deployment_at, :utc_datetime_usec
    field :stabilized_at,      :utc_datetime_usec

    has_one :promotion, PipelinePromotion, foreign_key: :stage_id

    has_many :services, StageService, foreign_key: :stage_id, on_replace: :delete
    has_many :from_edges, PipelineEdge, foreign_key: :from_id
    has_many :to_edges, PipelineEdge, foreign_key: :to_id

    belongs_to :context, PipelineContext
    belongs_to :applied_context, PipelineContext
    belongs_to :pipeline, Pipeline

    timestamps()
  end

  def pending_context(query \\ __MODULE__) do
    from(s in query, where: not is_nil(s.context_id) and (is_nil(s.applied_context_id) or s.context_id != s.applied_context))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(s in query, order_by: ^order)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name cursor last_deployment_at stabilized_at context_id applied_context_id)a)
    |> cast_assoc(:services)
    |> foreign_key_constraint(:pipeline_id)
    |> validate_required([:name])
  end
end
