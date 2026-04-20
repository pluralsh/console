defmodule Console.AI.Tools.Workbench.Observability.Plrl.LogLabels do
  use Console.AI.Tools.Workbench.Base
  import Piazza.Ecto.Schema
  alias Console.AI.Tools.Workbench.Observability.Plrl.Logs
  alias Console.Logs.{Query, Provider}

  embedded_schema do
    field :user,       :map, virtual: true
    field :service_id, :string
    field :cluster_id, :string
    field :query,      :string
    field :field,      :string
    field :limit,      :integer
    field :operator,   Console.Schema.Monitor.Operator, default: :or

    embeds_many :facets, Facet, on_replace: :delete, primary_key: false do
      field :name,  :string
      field :value, :string
    end

    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(service_id cluster_id query limit field operator)a

  def json_schema(_), do: Console.priv_file!("tools/workbench/observability/plrl_logs_labels.json") |> Jason.decode!()
  def name(_), do: "plrl_logs_facets"
  def description(_), do: "Gather log facets from Plural's built-in log aggregation integration.  If you want to find the values for a specific facet, provide the `field` parameter.  This requires either a Plural service_id or Plural cluster_id to be provided to authorize log extraction"

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

  def implement(_, %__MODULE__{user: user, field: field} = logs) do
    query = Logs.logs_query(logs) |> Map.put(:field, field)
    with {:ok, query} <- Query.accessible(query, user),
         {:ok, labels} <- Provider.labels(query) do
      Jason.encode(labels)
    end
  end
end
