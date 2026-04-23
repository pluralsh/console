defmodule Console.AI.Tools.Workbench.Infrastructure.KubeGet do
  use Console.AI.Tools.Agent.Base
  import Console.GraphQl.Resolvers.Kubernetes, only: [get_kind: 4]
  alias Console.Schema.{Cluster}
  alias Console.Deployments.Clusters

  embedded_schema do
    field :user,       :map, virtual: true
    field :cluster,    :string
    field :group,      :string
    field :version,    :string
    field :kind,       :string
    field :name,       :string
    field :namespace,  :string
  end

  @valid ~w(cluster group version kind name namespace)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:cluster, :version, :kind, :name])
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/kube_get.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "describe_k8s_resource"
  def description(_) do
    """
    Fetches a resource from kubernetes and returns its full definition as a json object.  This is only possible if the user has necessary RBAC permissions
    """
  end

  @kind_blacklist ~w(secrets)

  def implement(%__MODULE__{user: user, cluster: handle, group: g, version: v, kind: k} = comp) do
    with {:cluster, %Cluster{} = cluster} <- {:cluster, Clusters.get_cluster_by_handle(handle)},
         {:kind, kind} when kind not in @kind_blacklist <- {:kind, get_kind(cluster, g, v, k)},
         path <- Kube.Client.Base.path(g, v, kind, comp.namespace, comp.name),
         {:ok, res} <- kube_request(cluster, user, path) do
      Jason.encode(res)
    else
      {:kind, _} -> {:ok, "I cannot fetch the details of secrets for you"}
      {:cluster, _} -> {:ok, "No cluster found matching handle=#{handle}"}
      err -> {:error, "Error fetching resource: #{inspect(err)}"}
    end
  end

  def kube_request(cluster, user, path) do
    %Kazan.Request{
      method: "get",
      path: path,
      query_params: %{},
      response_model: Kube.Client.EchoModel
    }
    |> Kazan.run(server: Clusters.control_plane(cluster, user))
  end
end
