defmodule Console.Schema.PromotionCriteria do
  use Piazza.Ecto.Schema
  alias Console.Schema.{StageService, Service, PrAutomation}

  schema "promotion_criteria" do
    field :secrets, {:array, :string}

    belongs_to :pr_automation, PrAutomation
    belongs_to :stage_service, StageService
    belongs_to :source, Service

    timestamps()
  end

  @valid ~w(source_id pr_automation_id secrets)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:source_id)
    |> foreign_key_constraint(:stage_service_id)
    |> foreign_key_constraint(:pr_automation_id)
    |> unique_constraint(:stage_service_id)
  end
end
