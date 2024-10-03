defmodule Console.Schema.UpgradeInsightDetail do
  use Piazza.Ecto.Schema
  alias Console.Schema.UpgradeInsight

  schema "upgrade_insight_details" do
    field :status,      UpgradeInsight.Status
    field :used,        :string
    field :replacement, :string

    embeds_many :client_info, ClientInfo, on_replace: :delete do
      field :user_agent,      :string
      field :count,           :string
      field :last_request_at, :utc_datetime_usec
    end

    field :replaced_in, :string
    field :removed_in,  :string

    field :last_used_at, :utc_datetime_usec

    belongs_to :insight, UpgradeInsight

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(status used replacement replaced_in removed_in insight_id last_used_at)a)
    |> cast_embed(:client_info, with: &client_info_changeset/2)
    |> foreign_key_constraint(:insight_id)
    |> validate_required(~w(status used replacement)a)
  end

  defp client_info_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(user_agent count last_request_at)a)
    |> validate_required(~w(user_agent last_request_at)a)
  end
end
