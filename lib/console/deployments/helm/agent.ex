defmodule Console.Deployments.Helm.Agent do
  use GenServer, restart: :transient
  alias Console.Deployments.Git
  alias Console.Deployments.Helm.{AgentCache, Discovery}
  alias Console.Schema.HelmRepository
  require Logger

  defmodule State, do: defstruct [:repo, :cache]

  @poll :timer.minutes(2)
  @jitter 15

  def registry(), do: __MODULE__

  def fetch(pid, chart, vsn), do: GenServer.call(pid, {:fetch, chart, vsn})

  def digest(pid, chart, vsn), do: GenServer.call(pid, {:digest, chart, vsn})

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
    {:ok, %State{repo: repo, cache: AgentCache.new(repo)}}
  end

  def handle_call({:digest, c, v}, _, %State{cache: cache} = state) do
    case AgentCache.fetch(cache, c, v) do
      {:ok, l, cache} -> {:reply, {:ok, l.internal_digest}, %{state | cache: cache}}
      err -> {:reply, err, state}
    end
  end

  def handle_call({:fetch, c, v}, _, %State{cache: cache} = state) do
    with {:ok, l, cache} <- AgentCache.fetch(cache, c, v),
         {:ok, f} <- File.open(l.file) do
      {:reply, {:ok, f, l.digest}, %{state | cache: cache}}
    else
      err -> {:reply, err, state}
    end
  end

  def handle_info(:pull, %State{repo: repo, cache: cache} = state) do
    with {:ok, repo} <- Git.upsert_helm_repository(repo.url),
         {:ok, cache} <- AgentCache.refresh(cache),
         {:ok, repo} <- refresh(repo) do
      schedule_pull()
      {:noreply, %{state | cache: cache, repo: repo}}
    else
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

  def handle_info(_, state), do: {:noreply, state}

  defp refresh(%HelmRepository{} = repo) do
    HelmRepository.changeset(repo, %{pulled_at: Timex.now(), health: :pullable})
    |> Console.Repo.update()
  end

  defp schedule_pull(), do: Process.send_after(self(), :pull, @poll + jitter())

  defp jitter() do
    :rand.uniform(@jitter)
    |> :timer.seconds()
  end
end
