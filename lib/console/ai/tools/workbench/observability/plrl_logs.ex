defmodule Console.AI.Tools.Workbench.Observability.Plrl.Logs do
  use Console.AI.Tools.Workbench.Base
  import Piazza.Ecto.Schema
  alias Console.Logs.{Query, Provider, Time, Line}

  embedded_schema do
    field :user,       :map, virtual: true
    field :service_id, :string
    field :cluster_id, :string
    field :query,      :string
    field :limit,      :integer

    embeds_many :facets, Facet, on_replace: :delete, primary_key: false do
      field :name,  :string
      field :value, :string
    end

    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(service_id cluster_id query limit)a

  def json_schema(_), do: Console.priv_file!("tools/workbench/observability/plrl_logs.json") |> Jason.decode!()
  def name(_), do: "plrl_logs"
  def description(_), do: "Gather logs from the Plural's built-in log aggregation integration.  This requires either a Plural service_id or Plural cluster_id to be provided to authorize log extraction"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:time_range)
    |> cast_embed(:facets, with: &facet_changeset/2)
    |> validate_one_present([:service_id, :cluster_id])
  end

  defp facet_changeset(model, attrs) do
    model
    |> cast(attrs, [:name, :value])
    |> validate_required([:name, :value])
  end

  def implement(_, %__MODULE__{user: user} = logs) do
    query = logs_query(logs)
    with {:ok, query} <- Query.accessible(query, user),
         {:ok, logs} <- Provider.query(query),
         {:ok, content} <- Jason.encode(logs) do
      {:ok, %{content: content, logs: Enum.map(logs, &to_log/1)}}
    end
  end

  defp to_log(%Line{} = line) do
    %{
      timestamp: line.timestamp,
      message: line.log,
      labels: Map.new(line.facets, &{&1.key, &1.value}),
    }
  end

  def logs_query(%{query: q, limit: l, facets: f, time_range: tr}) do
    Query.new(
      query: q,
      limit: l,
      facets: Enum.map(f || [], & %{key: &1.name, value: &1.value}),
      time: to_time(tr)
    )
  end

  defp to_time(%{start: %{} = start_ts, end: %{} = end_ts}) do
    %Time{before: end_ts, after: start_ts}
  end
  defp to_time(_), do: %Time{before: Timex.now(), after: Timex.now() |> Timex.shift(minutes: -30)}
end
