defmodule Console.Mesh.Provider do
  alias Console.Schema.{Cluster, DeploymentSettings, OperationalLayout, Service}
  alias Console.Schema.DeploymentSettings.Connection
  alias Console.Mesh.Provider.{Istio, Ebpf, Linkerd}
  alias Console.Mesh.{Edge, Workload}

  @type parent :: Cluster.t | Service.t
  @type error :: Console.error
  @type opts :: [{:namespace, binary} | {:time, binary}]

  @callback graph(struct, opts) :: {:ok, [Edge.t]} | error

  @spec graph(parent, opts) :: {:ok, [Edge.t]} | error
  def graph(parent, opts \\ [])
  def graph(%Cluster{} = cluster, opts) do
    {ns, opts} = Keyword.pop(opts, :namespace)
    cluster = Console.Repo.preload(cluster, [:operational_layout])
    settings = Console.Deployments.Settings.cached()

    with {:ok, %mod{} = client} <- client(cluster, settings) do
      mod.graph(client, opts)
      |> filter_namespace(ns)
    end
  end

  def graph(%Service{namespace: ns} = service, opts) do
    %Service{cluster: %Cluster{} = cluster} = Console.Repo.preload(
      service,
      [cluster: :operational_layout]
    )

    graph(cluster, opts)
    |> filter_namespace(ns)
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
    %Cluster{operational_layout: %OperationalLayout{service_mesh: :linkerd}} = cluster,
    %DeploymentSettings{prometheus_connection: %Connection{host: h} = conn}
  ) when is_binary(h), do: {:ok, Linkerd.new(conn, cluster)}
  defp client(_, _), do: {:error, "no prometheus connection configured"}

  defp filter_namespace({:ok, [_ | _] = edges}, ns) when is_binary(ns) and byte_size(ns) > 0 do
    {:ok, Enum.filter(edges, fn
      %Edge{to: %Workload{namespace: ^ns}} -> true
      %Edge{from: %Workload{namespace: ^ns}} -> true
      _ -> false
    end)}
  end
  defp filter_namespace(pass, _), do: pass
end
