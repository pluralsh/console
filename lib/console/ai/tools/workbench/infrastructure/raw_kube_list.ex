defmodule Console.AI.Tools.Workbench.Infrastructure.RawKubeList do
  use Console.AI.Tools.Agent.Base
  import Console.GraphQl.Resolvers.Kubernetes, only: [get_kind: 4]
  import Console.AI.Tools.Workbench.Infrastructure.KubeGet, only: [kube_request: 3]
  alias Console.Deployments.Clusters
  alias Console.Schema.Cluster

  embedded_schema do
    field :user, :map, virtual: true
    field :cluster, :string
    field :group, :string
    field :version, :string
    field :kind, :string
    field :namespace, :string
  end

  @valid ~w(cluster group version kind namespace)a
  @kind_blacklist ~w(secrets)
  @json_schema Console.priv_file!("tools/workbench/infrastructure/kube_list.json")
               |> Jason.decode!()
               |> update_in(["properties"], &Map.delete(&1, "jq"))

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:cluster, :version, :kind])
  end

  def json_schema(_), do: @json_schema
  def name(_), do: "list_k8s_resources"

  def description(_) do
    "Lists Kubernetes resources and returns their full definitions as a JSON object. This requires the user's RBAC permissions."
  end

  def implement(%__MODULE__{user: user, cluster: handle, group: group, version: version, kind: kind} = tool) do
    with {:cluster, %Cluster{} = cluster} <- {:cluster, Clusters.get_cluster_by_handle(handle)},
         {:kind, resource_kind} when resource_kind not in @kind_blacklist <-
           {:kind, get_kind(cluster, group, version, kind)},
         path <- Kube.Client.Base.path(group, version, resource_kind, tool.namespace),
         {:ok, result} <- kube_request(cluster, user, path) do
      {:ok, result}
    else
      {:kind, _} -> {:ok, "I cannot list secrets for you"}
      {:cluster, _} -> {:ok, "No cluster found matching handle=#{handle}"}
      error -> {:error, "Error fetching resource: #{inspect(error)}"}
    end
  end
end
