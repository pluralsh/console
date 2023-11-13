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

  def pending(query \\ __MODULE__) do
    from(pp in query, where: is_nil(pp.promoted_at) or (pp.revised_at > pp.promoted_at))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(s in query, order_by: ^order)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(promoted_at revised_at)a)
    |> cast_assoc(:services)
  end
end
