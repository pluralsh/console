defmodule Console.Schema.PipelineStage do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Pipeline, StageService, PipelinePromotion}

  schema "pipeline_stages" do
    field :name,               :string
    field :cursor,             :binary_id
    field :last_deployment_at, :utc_datetime_usec
    field :stabilized_at,      :utc_datetime_usec

    has_one :promotion, PipelinePromotion, foreign_key: :stage_id
    has_many :services, StageService, foreign_key: :stage_id, on_replace: :delete
    belongs_to :pipeline, Pipeline

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name cursor last_deployment_at stabilized_at)a)
    |> cast_assoc(:services)
    |> foreign_key_constraint(:pipeline_id)
    |> validate_required([:name])
  end
end
