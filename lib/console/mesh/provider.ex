defmodule Console.Mesh.Provider do
  alias Console.Schema.{Cluster, DeploymentSettings, OperationalLayout}
  alias Console.Mesh.Edge
  alias Console.Mesh.Provider.Istio

  @type error :: Console.error
  @type opts :: [{:namespace, binary} | {:time, binary}]

  @callback graph(struct, opts) :: {:ok, [Edge.t]} | error

  @spec graph(Cluster.t, opts) :: {:ok, [Edge.t]} | error
  def graph(%Cluster{} = cluster, opts \\ []) do
    cluster = Console.Repo.preload(cluster, [:operational_layout])
    settings = Console.Deployments.Settings.cached()
    with {:ok, %mod{} = client} <- client(cluster, settings),
      do: mod.graph(client, opts)
  end

  defp client(
    %Cluster{operational_layout: %OperationalLayout{service_mesh: :istio}} = cluster,
    %DeploymentSettings{prometheus_connection: %DeploymentSettings.Connection{host: h} = conn}
  ) when is_binary(h), do: {:ok, Istio.new(conn, cluster)}
  defp client(_, _), do: {:error, "no prometheus connection configured or service mesh discovered"}
end
