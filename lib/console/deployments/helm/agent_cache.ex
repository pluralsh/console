defmodule Console.Deployments.Helm.AgentCache do
  alias Console.Helm.Client
  alias Console.Deployments.Helm.Utils
  require Logger

  defstruct [:repo, :index, :dir, cache: %{}]

  defmodule Line do
    @expiry [minutes: -10]
    defstruct [:file, :chart, :vsn, :digest, :touched]

    def new(file, chart, vsn, digest) do
      %__MODULE__{file: file, chart: chart, vsn: vsn, digest: digest, touched: Timex.now()}
    end

    def touch(%__MODULE__{} = mod), do: %{mod | touched: Timex.now()}

    def expire(%__MODULE__{file: f}), do: File.rm(f)

    def expired?(%__MODULE__{touched: touched}) do
      Timex.now()
      |> Timex.shift(@expiry)
      |> Timex.after?(touched)
    end
  end

  def new(repo) do
    {:ok, dir} = Briefly.create(directory: true)
    %__MODULE__{repo: repo, dir: dir, cache: %{}}
  end

  def refresh(%__MODULE__{} = cache) do
    case Client.index(cache.repo.url) do
      {:ok, indx} -> {:ok, sweep(%{cache | index: indx})}
      _ -> {:error, "could not fetch index"}
    end
  end

  def fetch(%__MODULE__{index: nil} = cache, chart, vsn) do
    with {:ok, cache} <- refresh(cache),
      do: fetch(cache, chart, vsn)
  end

  def fetch(%__MODULE__{cache: lines} = cache, chart, vsn) do
    case lines[{chart, vsn}] do
      %Line{} = l -> {:ok, l, put_in(cache.cache[{chart, vsn}], Line.touch(l))}
      nil -> write(cache, chart, vsn)
    end
  end

  def write(%__MODULE__{} = cache, chart, vsn) do
    path = Path.join(cache.dir, "#{chart}.#{vsn}.tgz")
    with {:ok, url, digest} <- Client.chart(cache.index, chart, vsn),
         {:ok, tmp} <- Briefly.create(),
         {:ok, _} <- Client.download(url, File.stream!(tmp)),
         :ok <- Utils.clean_chart(tmp, path, chart),
         line <- Line.new(path, chart, vsn, digest),
      do: {:ok, line, put_in(cache.cache[{chart, vsn}], line)}
  end

  defp sweep(%__MODULE__{cache: lines} = cache) do
    {keep, expire} = Enum.split_with(lines, fn {_, l} -> !Line.expired?(l) end)
    Enum.each(expire, &Line.expire/1)
    Enum.each(keep, fn l -> send(self(), {:refresh, l.chart, l.vsn}) end)
    %{cache | cache: Map.new(keep)}
  end
end
