defmodule Console.AI.Tools.Workbench.Infrastructure.KubeDelete do
  use Console.AI.Tools.Agent.Base
  import Console.GraphQl.Resolvers.Kubernetes, only: [get_kind: 4]
  import Console.AI.Tools.Workbench.Infrastructure.KubeUpdate, only: [check_policy: 2]
  alias Console.Schema.{Cluster}
  alias Console.Deployments.Clusters
  alias Console.AI.Tools.Workbench.KubeRequest

  embedded_schema do
    field :user,       :map, virtual: true
    field :job,        :map, virtual: true
    field :approval,   :map, virtual: true
    field :cluster,    :string
    field :group,      :string
    field :version,    :string
    field :kind,       :string
    field :name,       :string
    field :namespace,  :string
    field :explanation, :string
  end

  @valid ~w(cluster group version kind name namespace explanation)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_policy(model.job)
    |> validate_required([:cluster, :version, :kind, :name, :explanation])
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/kube_delete.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "delete_k8s_resource"
  def description(_) do
    """
    Deletes a resource in kubernetes by gvk and namespace + name.  This is only possible if the user has necessary RBAC permissions
    """
  end

  @kind_blacklist ~w(customresourcedefinition)

  def implement(%__MODULE__{cluster: handle, group: g, version: v, kind: k, explanation: explanation} = comp) do
    with {:cluster, %Cluster{} = cluster} <- {:cluster, Clusters.get_cluster_by_handle(handle)},
         {:kind, kind} when kind not in @kind_blacklist <- {:kind, get_kind(cluster, g, v, k)},
         path <- Kube.Client.Base.path(g, v, kind, comp.namespace, comp.name) do
      KubeRequest.new(
        handle: handle,
        method: "delete",
        path: path,
        content_type: "application/json",
        explanation: explanation,
        approval: comp.approval
      )
    else
      {:kind, _} -> {:ok, "I cannot delete custom resource definitions for you"}
      {:cluster, _} -> {:ok, "No cluster found matching handle=#{handle}"}
      err -> {:error, "Error fetching resource: #{inspect(err)}"}
    end
  end
end
