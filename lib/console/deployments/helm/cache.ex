defmodule Console.Deployments.Helm.Cache do
  require Logger
  alias Kube.HelmChart
  alias Console.Deployments.Tar

  defstruct [:dir]

  def new() do
    {:ok, dir} = Briefly.create(directory: true)
    %__MODULE__{dir: dir}
  end

  def fetch(%__MODULE__{dir: dir}, %HelmChart{
    spec: %HelmChart.Spec{chart: chart},
    status: %HelmChart.Status{artifact: %HelmChart.Status.Artifact{digest: sha, url: url}}
  }) when is_binary(url) do
    cache_path = Path.join(dir, sha)
    case File.exists?(cache_path) do
      true -> File.open(cache_path)
      false -> build_tarball(url, cache_path, chart)
    end
  end
  def fetch(_, _), do: {:error, "chart not yet loaded"}

  defp build_tarball(url, path, chart) do
    with {:ok, f} <- Tar.from_url(url),
         {:ok, contents} <- Tar.tar_stream(f),
         :ok <- Tar.tarball(path, remove_prefix(contents, chart)),
      do: File.open(path)
  end

  def refresh(%__MODULE__{dir: dir}) do
    Logger.info "expiring helm chart cache..."
    File.rm_rf!(dir)
    new()
  end

  defp remove_prefix(contents, chart) do
    Enum.map(contents, fn {path, content} -> {String.trim_leading(path, "#{chart}/"), content} end)
  end
end
