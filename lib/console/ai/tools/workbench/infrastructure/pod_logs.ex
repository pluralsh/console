defmodule Console.AI.Tools.Workbench.Infrastructure.PodLogs do
  use Console.AI.Tools.Workbench.Base
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Console.Deployments.Clusters
  alias Console.Schema.Cluster

  embedded_schema do
    field :user,          :map, virtual: true
    field :cluster,       :string
    field :name,          :string
    field :namespace,     :string
    field :container,     :string
    field :since_seconds, :integer, default: 5 * 1024
    field :limit_bytes,   :integer
  end

  @valid ~w(cluster name namespace container since_seconds limit_bytes)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:cluster, :name, :namespace, :container])
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/pod_logs.json")
               |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "pod_logs"
  def description(_) do
    """
    Lists the logs for a given pod in a given namespace.  This is only possible if the user has necessary RBAC permissions
    """
  end

  def implement(%__MODULE__{user: user, cluster: handle, name: n, namespace: ns} = comp) do
    with {:cluster, %Cluster{} = cluster} <- {:cluster, Clusters.get_cluster_by_handle(handle)} do
      Map.take(comp, [:container, :since_seconds, :limit_bytes])
      |> Map.to_list()
      |> then(&CoreV1.read_namespaced_pod_log!(ns, n, &1))
      |> Kazan.run(server: Clusters.control_plane(cluster, user))
    else
      {:cluster, _} -> {:error, "no cluster found matching handle=#{handle}"}
      err -> {:error, "error fetching pod logs: #{inspect(err)}"}
    end
  end
end
