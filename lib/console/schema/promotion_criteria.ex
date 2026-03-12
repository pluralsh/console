defmodule Console.Schema.PromotionCriteria do
  use Piazza.Ecto.Schema
  alias Console.Schema.{StageService, Service, PrAutomation, ScmConnection}

  schema "promotion_criteria" do
    field :secrets,    {:array, :string}
    field :repository, :string

    embeds_one :ai, AI, on_replace: :update do
      field :enabled, :boolean, default: true
      field :prompt,  :string
      field :title,   :string
      field :message, :string
    end

    belongs_to :connection,    ScmConnection
    belongs_to :pr_automation, PrAutomation
    belongs_to :stage_service, StageService
    belongs_to :source,        Service

    timestamps()
  end

  @valid ~w(repository source_id pr_automation_id secrets connection_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:ai, with: &ai_changeset/2)
    |> foreign_key_constraint(:source_id)
    |> foreign_key_constraint(:stage_service_id)
    |> foreign_key_constraint(:pr_automation_id)
    |> foreign_key_constraint(:connection_id)
    |> unique_constraint(:stage_service_id)
    |> maybe_require_repository()
  end

  defp maybe_require_repository(cs) do
    case get_field(cs, :ai) do
      %{enabled: true} -> validate_required(cs, [:repository])
      _ -> cs
    end
  end

  defp ai_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(enabled prompt title message)a)
    |> validate_required(~w(prompt)a)
  end
end
