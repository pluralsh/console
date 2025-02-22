defmodule Console.Schema.AiInsightEvidence do
  use Piazza.Ecto.Schema
  alias Console.Schema.{AiInsight, PullRequest}

  defenum Type, log: 0, pr: 1

  schema "ai_insight_evidence" do
    field :type, Type

    embeds_one :logs, Logs, on_replace: :update do
      field :service_id, :binary_id
      field :cluster_id, :binary_id

      embeds_many :lines, LogLine, on_replace: :delete do
        field :timestamp, :utc_datetime_usec
        field :log,       :string
      end
    end

    belongs_to :pull_request, PullRequest
    belongs_to :insight,      AiInsight

    timestamps()
  end

  @valid ~w(type pull_request_id insight_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(~w(type)a)
    |> cast_embed(:logs, with: &logs_changeset/2)
  end

  defp logs_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(service_id cluster_id)a)
    |> cast_embed(:lines, with: &line_changeset/2)
  end

  defp line_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(timestamp log)a)
  end
end
