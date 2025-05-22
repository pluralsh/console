defmodule Console.AI.Tools.Logs do
  use Ecto.Schema
  import EctoEnum
  import Ecto.Changeset
  import Console.AI.Tools.Utils

  alias Console.Logs.{Provider, Query, Time}
  alias Console.Schema.{Flow, Service}

  defenum Direction, gte: 0, lte: 1

  embedded_schema do
    field :query,              :string
    field :service_deployment, :string
    field :cluster,            :string
    field :timestamp,          :utc_datetime_usec
    field :direction,          Direction

    embeds_many :facets, Facet, on_replace: :delete do
      field :key,   :string
      field :value, :string
    end
  end

  @valid ~w(service_deployment cluster query timestamp direction)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:facets, with: &facet_changeset/2)
    |> validate_required(@valid -- ~w(query timestamp direction)a)
  end

  defp facet_changeset(model, attrs) do
    model
    |> cast(attrs, [:key, :value])
    |> validate_required([:key, :value])
  end

  @limit 20
  @json_schema Console.priv_file!("tools/logs.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("logs")
  def description() do
    """
    Lists at most #{@limit} logs for a given Plural Service Deployment and Plural Cluster.  If you need to find the name of the service deployment and cluster,
    call the `servicedeployments` and `clusters` tools first to grab them.
    """
  end

  def implement(%__MODULE__{service_deployment: service, cluster: cluster} = args) do
    with {:flow, %Flow{id: flow_id}} <- {:flow, Console.AI.Tool.flow()},
         {:svc, %Service{} = svc} <- {:svc, get_service(flow_id, service, cluster)},
         {:ok, logs} <- do_search(args, svc) do
      model(logs)
      |> Jason.encode()
    else
      {:flow, _} -> {:error, "no flow found"}
      {:svc, _} -> {:ok, "no service deployment found matching service_deployment=#{service} and cluster=#{cluster}, you must use a valid plural service deployment name for this flow"}
      err -> {:ok, "error fetching logs data: #{inspect(err)}"}
    end
  end

  defp do_search(%__MODULE__{query: query} = args, svc) do
    %Query{query: query, resource: svc, limit: @limit}
    |> add_time(args)
    |> add_facets(args)
    |> Provider.query()
  end

  defp add_time(q, %__MODULE__{timestamp: ts, direction: :gte}) when not is_nil(ts),
    do: %{q | time: %Time{after: ts, reverse: true}}
  defp add_time(q, %__MODULE__{timestamp: ts, direction: :lte}) when not is_nil(ts),
    do: %{q | time: %Time{before: ts}}
  defp add_time(_, %__MODULE__{timestamp: ts}) when not is_nil(ts),
    do: {:error, "must specify a direction when searching at a specific timestamp"}
  defp add_time(q, _), do: q

  defp add_facets(q, %__MODULE__{facets: [_ | _] = facets}), do: %{q | facets: facets}
  defp add_facets(q, _), do: q

  defp model(logs) do
    Enum.map(logs, fn line -> %{
      log: line.log,
      timestamp: line.timestamp,
      facets: Enum.map(line.facets, & %{key: &1.key, value: &1.value})
    } end)
  end
end
