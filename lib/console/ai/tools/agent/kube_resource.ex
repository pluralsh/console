defmodule Console.AI.Tools.Agent.KubeResource do
  use Console.AI.Tools.Agent.Base
  import Console.AI.Tools.Utils
  alias Console.Schema.{AgentSession, Cluster, User}
  alias Console.Deployments.Clusters

  embedded_schema do
    field :api_version,        :string
    field :kind,               :string
    field :namespace,          :string
    field :name,               :string
  end

  @valid ~w(api_version kind namespace name)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid -- ~w(namespace)a)
  end

  @json_schema Console.priv_file!("tools/agent/kube_resource.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("describe_kube_resource")
  def description() do
    """
    Fetches a service component from the given cluster and returns its full definition as a json object.  Can be used to provide the user with the current config in a cluster.

    Only use this if you know the exact resource location in kubernetes, otherwise use one of the search tools to find the inputs for this.
    """
  end

  @secrets ~w(secret Secret secrets Secrets)

  def implement(%__MODULE__{api_version: "v1", kind: secret}) when secret in @secrets,
    do: {:ok, "I cannot fetch the details of secrets for you"}
  def implement(%__MODULE__{} = comp) do
    spec = spec(comp)
    %User{} = user = Tool.actor()
    with {:session, %AgentSession{cluster: %Cluster{} = cluster}} <- session(),
         server <- Clusters.control_plane(cluster, user),
         _ <- Kube.Utils.save_kubeconfig(server),
         {:ok, res} <- fetch(spec, cluster) do
      Jason.encode(prune(res))
    else
      {:session, _} -> {:ok, "No cluster bound to this session, use the switch_cluster tool to switch to the right cluster"}
      err -> error(err)
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
