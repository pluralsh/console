defmodule Console.Schema.PipelinePromotion do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PromotionService, PipelineStage}

  schema "pipeline_promotions" do
    field :promoted_at, :utc_datetime_usec
    field :revised_at, :utc_datetime_usec

    belongs_to :stage, PipelineStage
    has_many :services, PromotionService, foreign_key: :promotion_id, on_replace: :delete

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(promoted_at revised_at)a)
    |> cast_assoc(:services)
  end
end
