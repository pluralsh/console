defmodule Console.Schema.UpgradeInsightDetail do
  use Piazza.Ecto.Schema
  alias Console.Schema.UpgradeInsight

  schema "upgrade_insight_details" do
    field :status,      UpgradeInsight.Status
    field :used,        :string
    field :replacement, :string

    field :replaced_in, :string
    field :removed_in,  :string

    field :last_used_at, :utc_datetime_usec

    belongs_to :insight, UpgradeInsight

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(status used replacement replaced_in removed_in insight_id last_used_at)a)
    |> foreign_key_constraint(:insight_id)
    |> validate_required(~w(status used replacement)a)
  end
end
