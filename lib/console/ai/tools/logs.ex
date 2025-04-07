defmodule Console.AI.Tools.Logs do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils

  alias Console.Logs.{Provider, Query}
  alias Console.Schema.{Flow, Service}

  embedded_schema do
    field :query,              :string
    field :service_deployment, :string
    field :cluster,            :string
  end

  @valid ~w(service_deployment cluster query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid -- [:query])
  end

  @json_schema Console.priv_file!("tools/logs.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("logs")
  def description() do
    """
    Lists logs for a given Plural Service Deployment and Plural Cluster.  If you need to find the name of the service and cluster,
    call the `servicedeployments` and `clusters` tools first to grab them.
    """
  end

  def implement(%__MODULE__{service_deployment: service, cluster: cluster, query: query}) do
    with {:flow, %Flow{id: flow_id}} <- {:flow, Console.AI.Tool.flow()},
         {:svc, %Service{} = svc} <- {:svc, get_service(flow_id, service, cluster)},
         {:ok, logs} <- Provider.query(%Query{query: query, resource: svc, limit: 20}) do
      model(logs)
      |> Jason.encode()
    else
      {:flow, _} -> {:error, "no flow found"}
      {:svc, _} -> {:ok, "no service deployment found matching service_deployment=#{service} and cluster=#{cluster}, you must use a valid plural service deployment name for this flow"}
      _ -> {:error, "internal error fetching logs data"}
    end
  end

  def model(logs) do
    Enum.map(logs, fn line -> %{
      log: line.log,
      timestamp: line.timestamp,
      facets: Enum.map(line.facets, fn facet ->
        %{key: facet.key, value: facet.value}
      end)
    } end)
  end
end
