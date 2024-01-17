defmodule Console.Deployments.Helm.Cache do
  require Logger
  alias Kube.HelmChart
  alias Console.Deployments.Tar

  defstruct [:dir, :touched]

  def new() do
    {:ok, dir} = Briefly.create(directory: true)
    %__MODULE__{dir: dir, touched: %{}}
  end

  def fetch(%__MODULE__{dir: dir} = cache, %HelmChart{
    spec: %HelmChart.Spec{chart: chart},
    status: %HelmChart.Status{artifact: %HelmChart.Status.Artifact{digest: sha, url: url}}
  }) when is_binary(url) do
    cache_path = Path.join(dir, sha)
    case File.exists?(cache_path) do
      true -> open(cache, cache_path)
      false -> build_tarball(url, cache, cache_path, chart)
    end
  end
  def fetch(_, _), do: {:error, "chart not yet loaded"}

  defp open(%__MODULE__{touched: touched} = cache, path) do
    with {:ok, f} <- File.open(path),
      do: {:ok, f, put_in(cache.touched, Map.put(touched, path, Timex.now()))}
  end

  defp build_tarball(url, cache, path, chart) do
    with {:ok, f} <- Tar.from_url(url),
         {:ok, contents} <- Tar.tar_stream(f),
         :ok <- Tar.tarball(path, remove_prefix(contents, chart)),
      do: open(cache, path)
  end

  def refresh(%__MODULE__{touched: touched} = cache) do
    Logger.info "expiring helm chart cache..."
    expires = Timex.now() |> Timex.shift(minutes: -30)
    touched = Enum.filter(touched, fn {p, t} ->
      case Timex.before?(t, expires) do
        true -> try_expire(p)
        _ -> true
      end
    end)
    |> Map.new()
    %{cache | touched: touched}
  end

  defp try_expire(path) do
    case File.rm(path) do
      {:ok, _} -> false
      _ -> true
    end
  end

  defp remove_prefix(contents, chart) do
    Enum.map(contents, fn {path, content} -> {String.trim_leading(path, "#{chart}/"), content} end)
  end
end
