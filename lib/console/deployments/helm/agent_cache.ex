defmodule Console.Deployments.Helm.AgentCache do
  alias Console.Helm.Client
  alias Console.Deployments.Helm.Utils
  require Logger

  @type t :: %__MODULE__{
    repo: Console.Helm.Repository.t(),
    client: Client.t(),
    index: Client.Index.t(),
    dir: binary,
    table: :ets.tid()
  }

  defstruct [:repo, :client, :index, :dir, :table]

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

  def new(repo, table) do
    {:ok, dir} = Briefly.create(directory: true)
    %__MODULE__{repo: repo, client: Client.client(repo), dir: dir, table: table}
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

  def get(%__MODULE__{table: t}, chart, vsn),  do: get(t, chart, vsn)

  def get(tid, chart, vsn) do
    case :ets.lookup(tid, {:chart, chart, vsn}) do
      [{{:chart, ^chart, ^vsn}, line}] -> {:ok, line}
      _ -> {:error, :not_found}
    end
  end

  def fetch(%__MODULE__{index: nil} = cache, chart, vsn) do
    with {:ok, cache} <- refresh(cache),
      do: fetch(cache, chart, vsn)
  end

  def fetch(%__MODULE__{} = cache, chart, vsn) do
    case get(cache, chart, vsn) do
      {:ok, %Line{} = l} -> {:ok, l, put(cache, Line.touch(l))}
      _ -> write(cache, chart, vsn)
    end
  end

  def touch?(%{touched: t}) when not is_nil(t) do
    Timex.now()
    |> Timex.shift(seconds: -1)
    |> Timex.after?(t)
  end
  def touch?(_), do: true

  def touch(%__MODULE__{} = cache, %Line{} = line),
    do: put(cache, Line.touch(line))

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
      {:ok, line, put(cache, line)}
    else
      {:cache, {line, true}} ->
        File.rm(tmp)
        {:ok, line, cache}
      err ->
        File.rm(tmp)
        err
    end
  end

  def put(%__MODULE__{table: t} = cache,  %Line{chart: c, vsn: vsn} = line) do
    :ets.insert(t, {{:chart, c, vsn}, line})
    cache
  end

  defp check_digest(%__MODULE__{table: t}, chart, vsn, digest) do
    case get(t, chart, vsn) do
      {:ok, %Line{digest: ^digest} = line} -> {line, true}
      {:ok, l} -> {l, false}
      _ -> {nil, false}
    end
  end

  defp sweep(%__MODULE__{table: t, repo: repo} = cache) do
    {kept, expired} = :ets.foldl(fn {_, l}, {keep, expired} ->
      case Line.expired?(l) do
        true ->
          Line.expire(l)
          :ets.delete(t, {:chart, l.chart, l.vsn})
          {keep, expired + 1}
        false ->
          send self(), {:refresh, l.chart, l.vsn}
          {keep + 1, expired}
      end
    end, {0, 0}, t)

    Logger.info "expired #{expired} stale helm cache entries for #{repo.url}, kept #{kept}"
    cache
  end
end
