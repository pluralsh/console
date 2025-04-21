defmodule Console.Schema.AiInsightEvidence do
  use Piazza.Ecto.Schema
  alias Console.Schema.AiInsight

  defenum Type, log: 0, pr: 1, alert: 2, knowledge: 3

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

    embeds_one :alert, Alert, on_replace: :update do
      field :title,      :string
      field :message,    :string
      field :alert_id,   :binary_id
      field :resolution, :string
      field :severity,   Console.Schema.Alert.Severity
    end

    embeds_one :pull_request, PullRequest, on_replace: :update do
      field :url,      :string
      field :title,    :string
      field :repo,     :string
      field :sha,      :string
      field :filename, :string
      field :contents, :string
      field :patch,    :string
    end

    embeds_one :knowledge, Knowledge, on_replace: :update do
      field :name, :string
      field :type, :string
      field :observations, {:array, :string}
    end

    belongs_to :insight, AiInsight

    timestamps()
  end

  @valid ~w(type insight_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(~w(type)a)
    |> cast_embed(:logs, with: &logs_changeset/2)
    |> cast_embed(:alert, with: &alert_changeset/2)
    |> cast_embed(:pull_request, with: &pr_changeset/2)
    |> cast_embed(:knowledge, with: &knowledge_changeset/2)
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

  defp alert_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(title message alert_id severity resolution)a)
  end

  defp pr_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(url title repo sha filename contents patch)a)
  end

  defp knowledge_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name type observations)a)
  end
end
