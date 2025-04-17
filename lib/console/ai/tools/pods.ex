defmodule Console.AI.Tools.Pods do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.Schema.{Flow, Service}
  alias Console.Deployments.Clusters
  alias Kazan.Apis.Core.V1, as: CoreV1

  embedded_schema do
    field :service_deployment, :string
    field :cluster, :string
  end

  @valid ~w(service_deployment cluster)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/pods.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("pods")
  def description() do
    """
    Lists pods for a given service and cluster. If you need to find the name of the service and cluster,
    call the `servicedeployments` and `clusters` tools first to grab them.
    """
  end

  def implement(%__MODULE__{service_deployment: service, cluster: cluster}) do
    with {:flow, %Flow{id: flow_id}} <- {:flow, Console.AI.Tool.flow()},
         {:svc, %Service{cluster: cluster} = svc} <- {:svc, get_service(flow_id, service, cluster)},
         server <- Clusters.control_plane(cluster),
         _ <- Kube.Utils.save_kubeconfig(server),
         {:ok, %{items: pods}} <- list_pods(svc) do
      Enum.map(pods, &k8s_map/1)
      |> Jason.encode()
    else
      {:flow, _} -> {:error, "no flow found"}
      {:svc, _} -> {:ok, "no service deployment found matching service_deployment=#{service} and cluster=#{cluster}, you must use a valid plural service deployment name for this flow"}
      _ -> {:error, "internal error fetching pod data"}
    end
  end

  defp list_pods(%Service{namespace: ns}) do
    CoreV1.list_namespaced_pod!(ns, [limit: 100])
    |> Kube.Utils.run()
  end
end
