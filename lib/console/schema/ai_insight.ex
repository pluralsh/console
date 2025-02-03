defmodule Console.Schema.AiInsight do
  use Piazza.Ecto.Schema
  alias Console.Schema.{
    Service,
    Stack,
    Cluster,
    StackRun,
    StackState,
    ServiceComponent,
    AiInsightEvidence,
    ClusterInsightComponent
  }

  @fast [minutes: -20]
  @slow [minutes: -45]

  schema "ai_insights" do
    field :sha,     :string
    field :text,    :string
    field :summary, :string

    embeds_many :error, Error, on_replace: :delete do
      field :source,  :string
      field :message, :string
    end

    has_one :service,     Service,    foreign_key: :insight_id
    has_one :stack,       Stack,      foreign_key: :insight_id
    has_one :cluster,     Cluster,    foreign_key: :insight_id
    has_one :stack_run,   StackRun,   foreign_key: :insight_id
    has_one :stack_state, StackState, foreign_key: :insight_id

    has_one :service_component, ServiceComponent, foreign_key: :insight_id
    has_one :cluster_insight_component, ClusterInsightComponent, foreign_key: :insight_id

    has_many :evidence, AiInsightEvidence, foreign_key: :insight_id

    timestamps()
  end

  @spec freshness(t()) :: :fresh | :stale | :expired
  def freshness(%__MODULE__{} = insight) do
    at = ts(insight)
    cond do
      Timex.before?(at, expiry(hours: -1)) -> :expired
      Timex.before?(at, expiry(@slow)) -> :stale
      true -> :fresh
    end
  end

  def expired(query \\ __MODULE__) do
    too_old = Timex.now() |> Timex.shift(hours: -1)
    from(i in query, where: coalesce(i.updated_at, i.inserted_at) <= ^too_old)
  end

  def memoized?(%__MODULE__{text: nil}), do: false
  def memoized?(%__MODULE__{error: [_ | _]} = is, _), do: Timex.after?(ts(is), expiry(@fast))
  def memoized?(%__MODULE__{sha: sha} = is, sha), do: Timex.after?(ts(is), expiry(@slow))
  def memoized?(%__MODULE__{} = is, _), do: Timex.after?(ts(is), expiry(@fast))
  def memoized?(_, _), do: false

  defp ts(%__MODULE__{updated_at: at, inserted_at: at2}), do: at || at2

  defp expiry(shift), do: Timex.shift(Timex.now(), shift)

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(sha summary text)a)
    |> cast_embed(:error, with: &error_changeset/2)
    |> cast_assoc(:evidence)
  end

  defp error_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(source message)a)
  end
end
