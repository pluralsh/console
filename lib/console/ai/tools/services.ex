defmodule Console.AI.Tools.Services do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.Repo
  alias Console.Schema.{Flow, Service, Cluster}

  embedded_schema do
    field :query,   :string
    field :cluster, :string
  end

  @valid ~w(query cluster)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/services.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("servicedeployments")
  def description() do
    """
    Searches the Plural Service Deployments (sometimes just called services) currently being deployed into this flow
    """
  end

  def implement(%__MODULE__{} = query) do
    for_flow(fn %Flow{id: flow_id} ->
      Service.for_flow(flow_id)
      |> Repo.all()
      |> Repo.preload([:cluster, :components])
      |> maybe_search(query)
      |> model()
      |> Jason.encode()
    end)
  end

  defp maybe_search(services, %__MODULE__{query: q, cluster: c}) do
    services
    |> Enum.filter(&filter_query(&1, q))
    |> Enum.filter(&filter_cluster(&1, c))
  end

  defp filter_query(%Service{name: n}, q) when is_binary(q),
    do: String.contains?(n, q)
  defp filter_query(_, _), do: true

  defp filter_cluster(%Service{cluster: %Cluster{handle: h}}, c) when is_binary(c),
    do: String.contains?(h, c)
  defp filter_cluster(_, _), do: true

  defp model(services) do
    Enum.map(services, fn service -> %{
      plural_service_deployment: service.name,
      cluster: service.cluster.handle,
      url: Console.url("/cd/clusters/#{service.cluster_id}/services/#{service.id}/components"),
      status: service.status,
      components: Enum.map(service.components, fn comp -> %{
        url: Console.url("/cd/clusters/#{service.cluster_id}/services/#{service.id}/components/#{comp.id}"),
        api_version: Kube.Utils.api_version(comp.group, comp.version),
        kind: comp.kind,
        namespace: comp.namespace,
        name: comp.name,
        state: comp.state,
      } end)
    } end)
  end
end
