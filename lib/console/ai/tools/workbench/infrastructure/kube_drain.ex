defmodule Console.AI.Tools.Workbench.Infrastructure.KubeDrain do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.Cluster
  alias Console.Deployments.Clusters
  alias Console.AI.Tools.Workbench.KubeDrain, as: KubeDrainRequest

  embedded_schema do
    field :user,        :map, virtual: true
    field :job,         :map, virtual: true
    field :approval,    :map, virtual: true
    field :cluster,     :string
    field :node,        :string
    field :explanation, :string
  end

  @valid ~w(cluster node explanation)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/kube_drain.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "drain_k8s_node"

  def description(_) do
    """
    Cordons and drains a Kubernetes node, safely evicting its workloads. This is only possible if
    the user has the necessary RBAC permissions for the node and the workloads running on it.
    """
  end

  def implement(%__MODULE__{
        cluster: handle,
        node: node,
        explanation: explanation,
        approval: approval
      }) do
    case Clusters.get_cluster_by_handle(handle) do
      %Cluster{} ->
        KubeDrainRequest.new(
          handle: handle,
          node: node,
          explanation: explanation,
          approval: approval
        )

      nil ->
        {:ok, "No cluster found matching handle=#{handle}"}
    end
  end
end
