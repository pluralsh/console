defmodule Console.AI.Tools.Workbench.Infrastructure.KubeExec do
  use Console.AI.Tools.Agent.Base
  import Console.AI.Tools.Workbench.Infrastructure.KubeUpdate, only: [check_policy: 2]
  alias Console.Schema.{Cluster}
  alias Console.Deployments.Clusters
  alias Console.AI.Tools.Workbench.KubeShell

  embedded_schema do
    field :user,        :map, virtual: true
    field :job,         :map, virtual: true
    field :approval,    :map, virtual: true
    field :cluster,     :string
    field :namespace,   :string
    field :pod,         :string
    field :container,   :string
    field :command,     :string
    field :explanation, :string
  end

  @valid ~w(cluster namespace pod container command explanation)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_policy(model.job)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/kube_exec.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "exec_k8s_pod"
  def description(_) do
    """
    Executes a command in a Kubernetes pod. This is only possible if the user has the necessary
    RBAC permissions, including `pods/exec` for the target pod.
    """
  end

  def implement(%__MODULE__{cluster: handle, namespace: ns, pod: p, container: ct, command: command, explanation: explanation}) do
    case Clusters.get_cluster_by_handle(handle) do
      %Cluster{} ->
        KubeShell.new(
          handle: handle,
          namespace: ns,
          pod: p,
          container: ct,
          command: command,
          explanation: explanation
        )
      nil -> {:ok, "No cluster found matching handle=#{handle}"}
    end
  end
end
