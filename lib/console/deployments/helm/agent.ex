defmodule Console.Deployments.Helm.Agent do
  use GenServer, restart: :transient
  alias Console.Repo
  alias Console.Deployments.{Git, Local.Server}
  alias Console.Deployments.Helm.{AgentCache, Discovery, Supervisor}
  alias Console.Schema.HelmRepository
  require Logger

  defmodule State, do: defstruct [:repo, :cache]

  @poll :timer.minutes(5)
  @timeout :timer.seconds(60)
  @jitter :timer.seconds(15)

  def registry(), do: __MODULE__

  @spec fetch(pid, binary, binary) :: {:ok, File.t(), binary} | {:error, term}
  def fetch(pid, chart, vsn) do
    with {:ok, tid} <- Supervisor.table(pid),
         {:ok, %AgentCache.Line{file: f, digest: d, internal_digest: i}} <- AgentCache.get(tid, chart, vsn),
         {:ok, f} <- Server.open(f) do
      {:ok, f, d, i}
    else
      _ -> GenServer.call(pid, {:fetch, chart, vsn}, @timeout)
    end
  end

  @spec digest(pid, binary, binary) :: {:ok, binary} | {:error, term}
  def digest(pid, chart, vsn) do
    with {:ok, tid} <- Supervisor.table(pid),
         {:ok, %AgentCache.Line{internal_digest: d}} <- AgentCache.get(tid, chart, vsn) do
      {:ok, d}
    else
      _ -> GenServer.call(pid, {:digest, chart, vsn}, @timeout)
    end
  end

  def start(url) do
    GenServer.start(__MODULE__, url, name: via(url))
  end

  def start_link([url]), do: start_link(url)
  def start_link(url) do
    GenServer.start_link(__MODULE__, url, name: via(url))
  end

  defp via(url), do: {:via, Registry, {registry(), {:helm, url}}}

  def init(url) do
    {:ok, repo} = Git.upsert_helm_repository(url)
    schedule_pull()
    :timer.send_interval(@poll, :move)
    send self(), :pull
    table = :ets.new(:helm_cache_data, [:set, :protected, read_concurrency: true])
    Supervisor.register(self(), table)
    {:ok, %State{repo: repo, cache: AgentCache.new(repo, table)}}
  end

  def handle_call({:digest, c, v}, _, %State{cache: cache} = state) do
    case AgentCache.fetch(cache, c, v) do
      {:ok, l, cache} -> {:reply, {:ok, l.internal_digest}, %{state | cache: cache}}
      err -> handle_error(err, state)
    end
  end

  def handle_call({:fetch, c, v}, _, %State{cache: cache} = state) do
    with {:ok, l, cache} <- AgentCache.fetch(cache, c, v),
         {:ok, f} <- File.open(l.file) do
      {:reply, {:ok, f, l.digest, l.internal_digest}, %{state | cache: cache}}
    else
      err -> handle_error(err, state)
    end
  end

  def handle_info(:pull, %State{repo: repo, cache: cache} = state) do
    with {:ok, repo}  <- Git.upsert_helm_repository(repo.url),
         cache        <- AgentCache.new_client(cache, repo),
         {:refresh, {:ok, cache}, repo} <- {:refresh, AgentCache.refresh(cache), repo},
         {:ok, repo}  <- refresh(repo) do
      schedule_pull()
      {:noreply, %{state | cache: cache, repo: repo}}
    else
      {:refresh, {:error, err}, repo} ->
        schedule_pull()
        Logger.error "Failed to resync helm repo: #{inspect(err)}"
        {:ok, repo} = persist_error(err, repo)
        {:noreply, %{state | repo: repo}}
      err ->
        schedule_pull()
        Logger.error "Failed to resync helm repo: #{inspect(err)}"
        {:noreply, state}
    end
  end

  def handle_info({:refresh, c, v}, %State{cache: cache} = state) do
    case AgentCache.write(cache, c, v) do
      {:ok, _, cache} -> {:noreply, %{state | cache: cache}}
      _ -> {:noreply, state}
    end
  end

  def handle_info(:move, %State{repo: repo} = state) do
    case Discovery.local?(repo.url) do
      true -> {:noreply, state}
      false -> {:stop, {:shutdown, :moved}, state}
    end
  end

  def handle_info({:touch, %AgentCache.Line{} = line}, %State{cache: c} = state),
    do: {:noreply, %{state | cache: AgentCache.touch(c, line)}}

  def handle_info(_, state), do: {:noreply, state}

  def terminate(_, _) do
    Supervisor.deregister(self())
  end

  defp refresh(%HelmRepository{} = repo) do
    HelmRepository.changeset(repo, %{pulled_at: Timex.now(), health: :pullable})
    |> Repo.update()
  end

  defp persist_error(error, repo) when is_binary(error) do
    HelmRepository.changeset(repo, %{health: :failed, error: error})
    |> Repo.update()
    |> case do
      {:ok, repo} -> {:ok, repo}
      err ->
        Logger.warning "failed to update helm repository: #{inspect(err)}"
        {:ok, repo}
    end
  end
  defp persist_error(_, repo), do: {:ok, repo}

  defp handle_error({:error, {:auth, err}}, %State{repo: repo} = state) do
    {:ok, repo} = persist_error(err, repo)
    {:reply, {:error, err}, %{state | repo: repo}}
  end
  defp handle_error(err, state), do: {:reply, err, state}

  defp schedule_pull(), do: Process.send_after(self(), :pull, @poll + :rand.uniform(@jitter))
end
