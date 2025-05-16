defmodule Console.Deployments.Helm.AgentCache do
  alias Console.Helm.Client
  alias Console.Deployments.Helm.Utils
  require Logger

  defstruct [:repo, :client, :index, :dir, cache: %{}]

  defmodule Line do
    @expiry [minutes: -30]
    defstruct [:file, :chart, :vsn, :digest, :internal_digest, :touched]

    def new(file, chart, vsn, digest) do
      %__MODULE__{
        file: file,
        chart: chart,
        internal_digest: Console.sha_file(file),
        vsn: vsn,
        digest: digest,
        touched: Timex.now()
      }
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
    %__MODULE__{repo: repo, client: Client.client(repo), dir: dir, cache: %{}}
  end

  def new_client(cache, repo) do
    %{cache | client: Client.client(repo)}
  end

  def refresh(%__MODULE__{client: client} = cache) do
    case Client.index(client) do
      {:ok, idx} -> {:ok, sweep(%{cache | index: idx})}
      _ -> {:error, "could not fetch index"}
    end
  end

  def get(%__MODULE__{cache: lines}, chart, vsn) do
    case lines[{chart, vsn}] do
      %Line{} = l -> {:ok, l}
      nil -> {:error, :not_found}
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

  def touch(%__MODULE__{} = cache, %Line{} = line),
    do: put_in(cache.cache[{line.chart, line.vsn}], Line.touch(line))

  def write(%__MODULE__{client: client} = cache, chart, vsn) do
    path = Path.join(cache.dir, "#{chart}.#{vsn}.tgz")
    tmp = Briefly.create!()
    with {:ok, client, url, digest} <- Client.chart(client, cache.index, chart, vsn),
         {:cache, {_, false}} <- {:cache, check_digest(cache, chart, vsn, digest)},
         {:ok, _} <- Client.download(client, url, File.stream!(tmp)),
         :ok <- Utils.clean_chart(tmp, path, chart),
         line <- Line.new(path, chart, vsn, digest),
         :ok <- File.rm(tmp) do
      cache = %{cache | client: client}
      {:ok, line, put_in(cache.cache[{chart, vsn}], line)}
    else
      {:cache, {line, true}} ->
        File.rm(tmp)
        {:ok, line, cache}
      err ->
        File.rm(tmp)
        err
    end
  end

  defp check_digest(%__MODULE__{cache: %{} = cache}, chart, vsn, digest) do
    case cache[{chart, vsn}] do
      %Line{digest: ^digest} = line -> {line, true}
      l -> {l, false}
    end
  end

  defp sweep(%__MODULE__{cache: lines} = cache) do
    {keep, expire} = Enum.split_with(lines, fn {_, l} -> !Line.expired?(l) end)
    Enum.each(expire, fn {_, l} -> Line.expire(l) end)
    Enum.each(keep, fn {_, l} -> send(self(), {:refresh, l.chart, l.vsn}) end)
    %{cache | cache: Map.new(keep)}
  end
end
