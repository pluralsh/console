defmodule Console.AI.Tools.Workbench.Observability.Plrl.LogsAggregate do
  use Console.AI.Tools.Workbench.Base
  import Piazza.Ecto.Schema
  alias Console.AI.Tools.Workbench.Observability.Plrl.Logs
  alias Console.Logs.{Query, Provider}

  embedded_schema do
    field :user,       :map, virtual: true
    field :service_id, :string
    field :cluster_id, :string
    field :query,      :string
    field :limit,      :integer
    field :operator,   Console.Schema.Monitor.Operator, default: :or

    embeds_many :facets, Facet, on_replace: :delete, primary_key: false do
      field :name,  :string
      field :value, :string
    end

    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(service_id cluster_id query limit operator)a

  def json_schema(_), do: Console.priv_file!("tools/workbench/observability/plrl_logs.json") |> Jason.decode!()
  def name(_), do: "plrl_logs_aggregate"
  def description(_), do: "Gather log count metrics from Plural's built-in log aggregation integration, especially useful for detecting spikes in logs during certain time periods.  This requires either a Plural service_id or Plural cluster_id to be provided to authorize log extraction"

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
    query = Logs.logs_query(logs)
    with {:ok, query} <- Query.accessible(query, user),
         {:ok, logs} <- Provider.aggregate(query) do
      Jason.encode(logs)
    end
  end
end
