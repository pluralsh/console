defmodule Console.Deployments.Helm.Cache do
  require Logger
  alias Kube.HelmChart
  alias Kube.HelmChart.Status
  alias Console.Deployments.Tar

  defstruct [:dir, :touched]

  def new() do
    {:ok, dir} = Briefly.create(directory: true)
    %__MODULE__{dir: dir, touched: %{}}
  end

  def present?(%__MODULE__{} = cache, chart) do
    case path(cache, chart) do
      {:ok, p} -> File.exists?(p)
      _ -> false
    end
  end

  def fetch(%__MODULE__{} = cache, %HelmChart{
    spec: %HelmChart.Spec{chart: chart},
    status: %Status{artifact: %Status.Artifact{url: url}}
  } = helm_chart) when is_binary(url) do
    {:ok, cache_path} = path(cache, helm_chart)
    case File.exists?(cache_path) do
      true -> open(cache, cache_path)
      false -> build_tarball(url, cache, cache_path, chart)
    end
  end
  def fetch(_, _), do: {:error, "chart not yet loaded"}

  def touch(%__MODULE__{touched: touched} = cache, %HelmChart{} = chart) do
    case path(cache, chart) do
      {:ok, cache_path} -> {:ok, put_in(cache.touched, Map.put(touched, cache_path, Timex.now()))}
      _ -> {:ok, cache}
    end
  end

  def path(%__MODULE__{dir: dir}, %HelmChart{
    status: %Status{artifact: %Status.Artifact{digest: sha}}
  }) when is_binary(sha) do
    {:ok, Path.join(dir, sha)}
  end
  def path(_, _), do: {:error, "chart not yet loaded"}

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
