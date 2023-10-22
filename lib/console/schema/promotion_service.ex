defmodule Console.Schema.PromotionService do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PipelinePromotion, Service, Revision}

  schema "promotion_services" do
    belongs_to :promotion, PipelinePromotion
    belongs_to :service,   Service
    belongs_to :revision,  Revision

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(service_id revision_id)a)
    |> foreign_key_constraint(:promotion_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:revision_id)
    |> unique_constraint([:promotion_id, :service_id])
  end
end
