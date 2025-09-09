defmodule Console.Schema.AiInsight do
  use Piazza.Ecto.Schema
  alias Console.Schema.{
    Alert,
    Service,
    Stack,
    Cluster,
    StackRun,
    StackState,
    ServiceComponent,
    AiInsightEvidence,
    ClusterInsightComponent
  }

  schema "ai_insights" do
    field :sha,     :string
    field :text,    :string
    field :summary, :string
    field :force,   :boolean

    embeds_many :error, Error, on_replace: :delete do
      field :source,  :string
      field :message, :string
    end

    has_one :alert,       Alert,      foreign_key: :insight_id
    has_one :service,     Service,    foreign_key: :insight_id
    has_one :stack,       Stack,      foreign_key: :insight_id
    has_one :cluster,     Cluster,    foreign_key: :insight_id
    has_one :stack_run,   StackRun,   foreign_key: :insight_id
    has_one :stack_state, StackState, foreign_key: :insight_id

    has_one :service_component, ServiceComponent, foreign_key: :insight_id
    has_one :cluster_insight_component, ClusterInsightComponent, foreign_key: :insight_id

    has_many :evidence, AiInsightEvidence, foreign_key: :insight_id, on_replace: :delete

    timestamps()
  end

  @spec freshness(t()) :: :fresh | :stale | :expired
  def freshness(%__MODULE__{} = insight) do
    at = ts(insight)
    slow_minutes = expiry_minutes(:slow)
    cond do
      Timex.before?(at, Timex.shift(Timex.now(), minutes: round(slow_minutes * 1.5))) -> :expired
      Timex.before?(at, Timex.shift(Timex.now(), minutes: slow_minutes)) -> :stale
      true -> :fresh
    end
  end

  def expired(query \\ __MODULE__) do
    too_old = Timex.now()
              |> Timex.shift(minutes: expiry_minutes(:slow) * 3)
    from(i in query, where: coalesce(i.updated_at, i.inserted_at) <= ^too_old)
  end

  def memoized?(%__MODULE__{force: true}), do: false
  def memoized?(%__MODULE__{text: nil}), do: false
  def memoized?(%__MODULE__{error: [_ | _]} = is, _), do: Timex.after?(ts(is), expiry(:fast))
  def memoized?(%__MODULE__{sha: sha} = is, sha), do: Timex.after?(ts(is), expiry(:slow))
  def memoized?(%__MODULE__{} = is, _), do: Timex.after?(ts(is), expiry(:fast))
  def memoized?(_, _), do: false

  defp ts(%__MODULE__{updated_at: at, inserted_at: at2}), do: at || at2

  defp expiry_minutes(rate) when rate in [:fast, :slow] do
    case Console.Deployments.Settings.fetch() do
      %Console.Schema.DeploymentSettings{ai: %{analysis_rates: %{^rate => minutes}}}
        when is_integer(minutes) -> -minutes
      _ -> rate(rate)
    end
  end

  defp rate(:fast), do: -20
  defp rate(:slow), do: -45

  defp expiry(rate) when rate in [:fast, :slow],
    do: Timex.shift(Timex.now(), minutes: expiry_minutes(rate))

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(sha summary text force)a)
    |> cast_embed(:error, with: &error_changeset/2)
    |> cast_assoc(:evidence)
  end

  defp error_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(source message)a)
  end
end
