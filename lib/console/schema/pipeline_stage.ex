defmodule Console.Schema.PipelineStage do
  use Piazza.Ecto.Schema

  alias Console.Schema.{
    Pipeline,
    StageService,
    PipelinePromotion,
    PipelineEdge,
    PipelineContext,
    PipelinePullRequest,
    ServiceError
  }

  schema "pipeline_stages" do
    field(:name, :string)
    field(:cursor, :binary_id)
    field(:last_deployment_at, :utc_datetime_usec)
    field(:stabilized_at, :utc_datetime_usec)

    has_one(:promotion, PipelinePromotion, foreign_key: :stage_id)

    has_many(:services, StageService, foreign_key: :stage_id, on_replace: :delete)
    has_many(:from_edges, PipelineEdge, foreign_key: :from_id)
    has_many(:to_edges, PipelineEdge, foreign_key: :to_id)
    has_many(:errors, ServiceError, foreign_key: :pipeline_stage_id, on_replace: :delete)

    belongs_to(:context, PipelineContext)
    belongs_to(:applied_context, PipelineContext)
    belongs_to(:pipeline, Pipeline)

    timestamps()
  end

  def pending_context(query \\ __MODULE__) do
    from(s in query,
      left_join: ss in assoc(s, :services),
      left_join: c in assoc(ss, :criteria),
      left_join: pr in PipelinePullRequest,
      on:
        pr.stage_id == s.id and pr.service_id == ss.service_id and pr.context_id == s.context_id,
      where:
        not is_nil(s.context_id) and
          (is_nil(s.applied_context_id) or s.context_id != s.applied_context_id or
             (not is_nil(c.pr_automation_id) and (is_nil(pr.id) or is_nil(pr.pull_request_id)))),
      distinct: true
    )
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(s in query, order_by: ^order)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(
      attrs,
      ~w(name cursor last_deployment_at stabilized_at context_id applied_context_id)a
    )
    |> cast_assoc(:services)
    |> cast_assoc(:errors)
    |> foreign_key_constraint(:pipeline_id)
    |> validate_required([:name])
  end
end
