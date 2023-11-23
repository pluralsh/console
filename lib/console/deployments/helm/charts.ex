defmodule Console.Deployments.Helm.Charts do
  alias Kube.Client
  alias Kube.HelmChart
  alias Console.Schema.Service
  alias Console.Deployments.Tar

  @doc """
  Downloads a chart artifact from the found chart crd of the given service
  """
  @spec artifact(Service.t) :: {:ok, File.t, binary} | Console.error
  def artifact(%Service{} = svc) do
    with {:ok, %HelmChart{
            spec: %HelmChart.Spec{chart: chart},
            status: %HelmChart.Status{artifact: %HelmChart.Status.Artifact{digest: sha, url: url}}
          }} when is_binary(url) <- get(svc),
         {:ok, f} <- Tar.from_url(url),
         {:ok, contents} <- Tar.tar_stream(f),
         {:ok, f} <- Tar.tarball(remove_prefix(contents, chart)) do
      {:ok, f, sha}
    else
      {:ok, _} -> {:error, "chart not yet loaded"}
      err -> err
    end
  end

  defp remove_prefix(contents, chart) do
    Enum.map(contents, fn {path, content} -> {String.trim_leading(path, "#{chart}/"), content} end)
  end

  @spec get(Service.t) :: {:ok, HelmChart.t} | Console.error
  def get(%Service{helm: %Service.Helm{chart: chart, version: vsn, repository: %{namespace: ns, name: n}}}) do
    name = chart_name(n, chart, vsn)
    case Client.get_helm_chart(ns, name) do
      {:ok, chart} -> {:ok, chart}
      _ -> jit_create(ns, name, n, chart, vsn)
    end
  end

  defp jit_create(namespace, name, repo, chart, version) do
    Client.create_helm_chart(%HelmChart{
      metadata: %{
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
