defmodule Console.Mesh.Provider do
  alias Console.Schema.{Cluster, DeploymentSettings, OperationalLayout, Service}
  alias Console.Schema.DeploymentSettings.Connection
  alias Console.Mesh.Provider.{Istio, Ebpf}
  alias Console.Mesh.Edge

  @type parent :: Cluster.t | Service.t
  @type error :: Console.error
  @type opts :: [{:namespace, binary} | {:time, binary}]

  @callback graph(struct, opts) :: {:ok, [Edge.t]} | error

  @spec graph(parent, opts) :: {:ok, [Edge.t]} | error
  def graph(parent, opts \\ [])
  def graph(%Cluster{} = cluster, opts) do
    cluster = Console.Repo.preload(cluster, [:operational_layout])
    settings = Console.Deployments.Settings.cached()
    with {:ok, %mod{} = client} <- client(cluster, settings),
      do: mod.graph(client, opts)
  end

  def graph(%Service{namespace: ns} = service, opts) do
    %Service{cluster: %Cluster{} = cluster} = Console.Repo.preload(
      service,
      [cluster: :operational_layout]
    )
    graph(cluster, [{:namespace, ns} | opts])
  end

  defp client(
    %Cluster{operational_layout: %OperationalLayout{service_mesh: :ebpf}} = cluster,
    %DeploymentSettings{prometheus_connection: %Connection{host: h} = conn}
  ) when is_binary(h), do: {:ok, Ebpf.new(conn, cluster)}
  defp client(
    %Cluster{operational_layout: %OperationalLayout{service_mesh: :istio}} = cluster,
    %DeploymentSettings{prometheus_connection: %Connection{host: h} = conn}
  ) when is_binary(h), do: {:ok, Istio.new(conn, cluster)}
  defp client(
    cluster,
    %DeploymentSettings{prometheus_connection: %Connection{host: h} = conn}
  ) when is_binary(h), do: {:ok, Ebpf.new(conn, cluster)}
  defp client(_, _), do: {:error, "no prometheus connection configured"}
end
