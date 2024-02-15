defmodule Console.Schema.PipelineContext do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Pipeline, PipelinePullRequest}

  schema "pipeline_contexts" do
    field :context, :map

    belongs_to :pipeline, Pipeline

    has_many :pipeline_pull_requests, PipelinePullRequest, foreign_key: :context_id
    has_many :pull_requests, through: [:pipeline_pull_requests, :pull_request]

    timestamps()
  end

  def for_pipeline(query \\ __MODULE__, id) do
    from(pc in query, where: pc.pipeline_id == ^id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(pc in query, order_by: ^order)
  end

  @valid ~w(context pipeline_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:pipeline_id)
    |> validate_required(@valid)
  end
end
