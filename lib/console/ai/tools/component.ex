defmodule Console.AI.Tools.Component do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.Schema.{Flow, Service}
  alias Console.Deployments.{Clusters, Services}

  embedded_schema do
    field :service_deployment, :string
    field :cluster,            :string
    field :api_version,       :string
    field :kind,               :string
    field :namespace,          :string
    field :name,               :string
  end

  @valid ~w(service_deployment cluster api_version kind namespace name)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid -- ~w(namespace)a)
  end

  @json_schema Console.priv_file!("tools/component.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("describe_component")
  def description() do
    """
    Describes a kubernetes resource referenced as a service component for the given Plural Service Deployment.
    Use this to get a full json spec of a kubernetes resource associated with a Plural Service. If you need to find the name of the service and cluster,
    call the `servicedeployments` and `clusters` tools first to grab them.
    """
  end

  @secrets ~w(secret Secret secrets Secrets)

  def implement(%__MODULE__{api_version: "v1", kind: secret}) when secret in @secrets,
    do: {:ok, "I cannot fetch the details of secrets for you"}
  def implement(%__MODULE__{service_deployment: service, cluster: cluster} = comp) do
    spec = spec(comp)
    with {:flow, %Flow{id: flow_id}} <- {:flow, Console.AI.Tool.flow()},
         {:svc, %Service{cluster: cluster} = svc} <- {:svc, get_service(flow_id, service, cluster)},
         server <- Clusters.control_plane(cluster),
         _ <- Kube.Utils.save_kubeconfig(server),
         {:comp, {:ok, _}} <- {:comp, Services.accessible(svc, spec)},
         {:ok, res} <- fetch(spec, cluster) do
      Jason.encode(prune(res))
    else
      {:flow, _} -> {:error, "no flow found"}
      {:svc, _} -> {:ok, "no service deployment found matching service_deployment=#{service} and cluster=#{cluster}, you must use a valid plural service deployment name for this flow"}
      {:comp, err} ->
        {:ok, "#{Poison.encode!(spec)} is likely not a member of the Plural service #{service}, full error: #{inspect(err)}"}
      err -> {:error, "internal error fetching component data: #{inspect(err)}"}
    end
  end

  def spec(%__MODULE__{api_version: api_version} = comp) do
    {g, v} = Kube.Utils.group_version(api_version)
    %{group: g, version: v, kind: comp.kind, namespace: comp.namespace, name: comp.name}
  end

  defp fetch(%{group: g, version: v, kind: k, name: n} = spec, cluster) do
    kind = get_kind(cluster, g, v, k)

    Kube.Client.Base.path(g, v, kind, spec[:namespace], n)
    |> Kube.Client.raw()
  end

  defp get_kind(cluster, g, v, k) do
    Clusters.api_discovery(cluster)
    |> Map.get({g, v, k})
    |> case do
      name when is_binary(name) -> name
      _ -> Kube.Utils.inflect(k)
    end
  end
end
