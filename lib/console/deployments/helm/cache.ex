defmodule Console.Deployments.Helm.Cache do
  require Logger
  alias Kube.HelmChart
  alias Kube.HelmChart.Status
  alias Console.Deployments.{Helm.Utils, Tar}

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
  def fetch(_, chart), do: {:error, "chart not yet loaded: #{reason(chart)}"}

  def touch(%__MODULE__{touched: touched} = cache, %HelmChart{} = chart) do
    case path(cache, chart) do
      {:ok, cache_path} -> {:ok, put_in(cache.touched, Map.put(touched, cache_path, Timex.now()))}
      _ -> {:ok, cache}
    end
  end

  def path(%__MODULE__{dir: dir}, %HelmChart{
    status: %Status{artifact: %Status.Artifact{digest: sha}}
  }) when is_binary(sha), do: {:ok, Path.join(dir, sha)}
  def path(_, _), do: {:error, "chart not yet loaded"}

  defp open(%__MODULE__{touched: touched} = cache, path) do
    with {:ok, f} <- File.open(path),
      do: {:ok, f, put_in(cache.touched, Map.put(touched, path, Timex.now()))}
  end

  defp build_tarball(url, cache, path, chart) do
    with {:ok, path} <- download_to(url, path, chart),
      do: open(cache, path)
  end

  def download_to(url, path, chart) do
    with {:ok, tmp} <- Tar.from_url(url),
         :ok <- File.open!(tmp, [:raw]) |> Utils.clean_chart(path, chart),
         :ok <- File.rm(tmp),
      do: {:ok, path}
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

  def reason(%HelmChart{status: %Status{conditions: [_ | _] = conditions}}) do
    case Enum.find(conditions, & &1.type == "Ready") do
      %Status.Conditions{message: msg} -> msg
      _ -> "downloading"
    end
  end
  def reason(_), do: "downloading"
end
