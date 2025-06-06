defmodule Console.Deployments.Helm.Charts do
  alias Kube.Client
  alias Kube.HelmChart
  alias Console.SmartFile
  alias Console.Schema.Service
  alias Console.Cached.HelmChart, as: ChartCache
  alias Console.Deployments.Helm.{Server, Cache}
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1


  @doc """
  Fetch just the sha for a given chart if known
  """
  @spec digest(Service.t) :: {:ok, binary} | Console.error
  def digest(%Service{} = svc) do
    case get(svc) do
      {:ok, %{status: %{artifact: %{digest: d}}}} when is_binary(d) -> {:ok, d}
      {:ok, c} -> {:error, "Chart not yet loaded: #{Cache.reason(c)}"}
      err -> err
    end
  end

  @doc """
  Downloads a chart artifact from the found chart crd of the given service
  """
  @spec artifact(Service.t) :: {:ok, SmartFile.t, binary} | Console.error
  def artifact(%Service{} = svc) do
    with {:ok, chart} <- get(svc),
         {:ok, f} <- Server.fetch(chart) do
      {:ok, f, chart.status.artifact.digest}
    else
      {:ok, _} -> {:error, "chart not yet loaded"}
      err -> err
    end
  end

  @spec get(Service.t) :: {:ok, HelmChart.t} | Console.error
  def get(%Service{helm: %Service.Helm{chart: chart, version: vsn, repository: %{namespace: ns, name: n}}})
    when is_binary(chart) and is_binary(vsn) do
    name = chart_name(n, chart, vsn)
    with {:cache, nil} <- {:cache, ChartCache.get(ns, name)},
         {:server, {:ok, chart}} <- {:server, Client.get_helm_chart(ns, name)} do
      {:ok, chart}
    else
      {:cache, %HelmChart{} = chart} -> {:ok, chart}
      {:server, _} -> jit_create(ns, name, n, chart, vsn)
    end
  end
  def get(_), do: {:error, "service does not reference a flux helm chart"}

  defp jit_create(namespace, name, repo, chart, version) do
    Client.create_helm_chart(%HelmChart{
      metadata: %MetaV1.ObjectMeta{
        name: name,
        namespace: namespace,
        annotations: %{
          "platform.plural.sh/helm-chart" => "true"
        }
      },
      spec: %HelmChart.Spec{
        interval: "5m0s",
        chart: chart,
        version: version,
        reconcile_strategy: "ChartVersion",
        source_ref: %HelmChart.Spec.SourceRef{
          kind: "HelmRepository",
          name: repo,
        },
      }
    }, namespace)
  end

  @doc """
  fetches the crd name we use for a given chart
  """
  @spec chart_name(binary, binary, binary) :: binary
  def chart_name(repo, chart, vsn) do
    vsn = Console.shab16(vsn)
          |> String.slice(0..6)
    "plrl-#{repo}-#{chart}-#{vsn}"
  end
end
