defmodule Console.Schema.StageService do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PipelineStage, Service, PromotionCriteria}

  schema "stage_services" do
    belongs_to :stage,    PipelineStage
    belongs_to :service,  Service

    has_one :criteria, PromotionCriteria, on_replace: :update

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(stage_id service_id)a)
    |> cast_assoc(:criteria)
    |> foreign_key_constraint(:stage_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:criteria_id)
    |> unique_constraint([:stage_id, :service_id])
  end
end
