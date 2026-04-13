defmodule Console.AI.Tools.Workbench.Infrastructure.KubeList do
  use Console.AI.Tools.Agent.Base
  import Console.GraphQl.Resolvers.Kubernetes, only: [get_kind: 4]
  import Console.AI.Tools.Workbench.Infrastructure.KubeGet, only: [kube_request: 3]
  alias Console.Deployments.Clusters
  alias Console.Schema.{Cluster}

  embedded_schema do
    field :user,       :map, virtual: true
    field :cluster,    :string
    field :group,      :string
    field :version,    :string
    field :kind,       :string
    field :namespace,  :string
  end

  @valid ~w(cluster group version kind namespace)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:cluster, :version, :kind])
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/kube_list.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "list_k8s_resources"
  def description(_) do
    """
    Lists resources from kubernetes and returns their full definitions as a json object.  This is only possible if the user has necessary RBAC permissions
    """
  end

  @kind_blacklist ~w(secrets)

  def implement(_, %__MODULE__{user: user, cluster: handle, group: g, version: v, kind: k} = comp) do
    with {:cluster, %Cluster{} = cluster} <- {:cluster, Clusters.get_cluster_by_handle(handle)},
         {:kind, kind} when kind not in @kind_blacklist <- {:kind, get_kind(cluster, g, v, k)},
         path <- Kube.Client.Base.path(g, v, kind, comp.namespace),
         {:ok, res} <- kube_request(cluster, user, path) do
      Jason.encode(res)
    else
      {:kind, _} -> {:ok, "I cannot list secrets for you"}
      {:cluster, _} -> {:ok, "No cluster found matching handle=#{handle}"}
      err -> {:error, "Error fetching resource: #{inspect(err)}"}
    end
  end
end
