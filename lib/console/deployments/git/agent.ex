defmodule Console.Deployments.Git.Agent do
  @moduledoc """
  Implements a git poller + git pull cache.  Caching behavior is delegated to `Console.Deployments.Git.Cache`
  and polling is done on a fixed interval, with the cache being refreshed after each poll.

  We can then initiate a file stream out of this agent, which supports cross-node streams in case a repo tarball
  fetch is served on a separate node as this agent.
  """
  use GenServer, restart: :transient
  import Console.Deployments.Git.Cmd
  import Console.Prom.Plugin, only: [metric_scope: 1]
  alias Console.Repo
  alias Console.Deployments.{Git.Cache, Git, Services}
  alias Console.Schema.{GitRepository, Service}

  require Logger

  @poll :timer.seconds(120)
  @jitter 120
  @jitter_offset :timer.seconds(60)
  @timeout 10_000

  defmodule State, do: defstruct [:git, :cache, :last_pull]

  def registry(), do: __MODULE__

  def fetch(pid, %Service{} = svc) do
    case fetch_line(pid, svc.git) do
      {:ok, %Cache.Line{file: f, sha: sha, message: msg}} ->
        Services.update_sha(svc, sha, msg)
        File.open(f)
      _ -> GenServer.call(pid, {:fetch, svc}, @timeout)
    end
  end

  def fetch(pid, %Service.Git{} = ref) do
    case fetch_line(pid, ref) do
      {:ok, %Cache.Line{file: f}} -> File.open(f)
      _ -> GenServer.call(pid, {:fetch, ref}, @timeout)
    end
  end

  def digest(pid, %Service.Git{} = ref)  do
    case fetch_line(pid, ref) do
      {:ok, %Cache.Line{digest: sha}} -> {:ok, sha}
      _ -> GenServer.call(pid, {:digest, ref}, @timeout)
    end
  end

  defp fetch_line(pid, %Service.Git{} = ref) do
    with {:ok, cache} <- get_cache(pid),
         {:ok, %Cache.Line{} = line} <- Cache.get(cache, ref) do
      send pid, {:touch, line}
      {:ok, line}
    end
  end
  defp fetch_line(_, _), do: {:error, :not_found}

  def docs(pid, %Service{} = svc), do: GenServer.call(pid, {:docs, svc}, @timeout)

  def refs(pid), do: GenServer.call(pid, :refs, @timeout)

  def addons(pid), do: GenServer.call(pid, :addons, @timeout)

  def sha(pid, ref), do: GenServer.call(pid, {:sha, ref}, @timeout)

  def tags(pid), do: GenServer.call(pid, :tags, @timeout)

  def changes(pid, sha1, sha2, folder), do: GenServer.call(pid, {:changes, sha1, sha2, folder}, 30_000)

  def kick(pid), do: send(pid, :pull)

  def start(%GitRepository{} = repo) do
    GenServer.start(__MODULE__, repo, name: via(repo))
  end

  def start_link([%GitRepository{} = repo]), do: start_link(repo)
  def start_link(%GitRepository{} = repo) do
    GenServer.start_link(__MODULE__, repo, name: via(repo))
  end

  defp via(%GitRepository{id: id}), do: {:via, Registry, {registry(), {:git, id}}}

  def init(repo) do
    {:ok, dir} = Briefly.create(directory: true)
    {:ok, repo} = save_private_key(%{repo | dir: dir})
    cache = Cache.new(repo)
    # :timer.send_interval(@poll, :pull)
    schedule_pull()
    :timer.send_interval(@poll, :move)
    send self(), :clone
    :telemetry.execute(metric_scope(:git_agent), %{count: 1}, %{url: repo.url})

    {:ok, %State{git: repo, cache: store_cache(cache)}}
  end

  def handle_call(:addons, _, %State{cache: cache} = state) do
    case Cache.fetch(cache, "main", "addons", &String.ends_with?(&1, "addon.yaml")) do
      {:ok, %Cache.Line{file: f}, cache} -> {:reply, File.open(f), %{state | cache: store_cache(cache)}}
      err -> {:reply, err, state}
    end
  end

  def handle_call({:docs, %Service{git: %{ref: ref}} = svc}, _, %State{cache: cache} = state) do
    case Cache.fetch(cache, ref, Service.docs_path(svc)) do
      {:ok, %Cache.Line{file: f}, cache} -> {:reply, File.open(f), %{state | cache: store_cache(cache)}}
      err -> {:reply, err, state}
    end
  end

  def handle_call(:refs, _, %State{cache: %Cache{heads: %{} = heads}} = state) do
    refs = Map.keys(heads)
    important = MapSet.new(~w(main master dev))
    {common, rest} = Enum.split_with(refs, &MapSet.member?(important, &1))
    {:reply, {:ok, common ++ Enum.sort(rest)}, state}
  end
  def handle_call(:refs, _, state), do: {:reply, {:ok, []}, state}

  def handle_call({:sha, ref}, _, %State{cache: cache} = state) do
    {:reply, Cache.commit(cache, ref), state}
  end

  def handle_call({:changes, sha1, sha2, folder}, _, %State{cache: cache} = state) do
    {cache, result} = Cache.cached_changes(cache, sha1, sha2, folder)
    {:reply, result, %{state | cache: store_cache(cache)}}
  end

  def handle_call({:digest, %Service.Git{} = ref}, _, %State{cache: cache} = state) do
    case Cache.fetch(cache, ref) do
      {:ok, %Cache.Line{digest: sha}, cache} -> {:reply, {:ok, sha}, %{state | cache: store_cache(cache)}}
      err -> {:reply, err, state}
    end
  end

  def handle_call({:fetch, %Service.Git{} = ref}, _, %State{cache: cache} = state) do
    case Cache.fetch(cache, ref) do
      {:ok, %Cache.Line{file: f}, cache} -> {:reply, File.open(f), %{state | cache: store_cache(cache)}}
      err -> {:reply, err, state}
    end
  end

  def handle_call({:fetch, %Service{git: %Service.Git{} = ref} = svc}, _, %State{cache: cache} = state) do
    svc = Console.Repo.preload(svc, [:revision])
    with {:ok, %Cache.Line{file: f, sha: sha, message: msg}, cache} <- Cache.fetch(cache, ref),
         {:ok, _} <- Services.update_sha(svc, sha, msg) do
      {:reply, File.open(f), %{state | cache: store_cache(cache)}}
    else
      err -> {:reply, err, state}
    end
  end

  def handle_call(:tags, _, %State{cache: cache} = state),
    do: {:reply, Cache.tags(cache), state}

  def handle_info(:clone, %State{git: git, cache: cache} = state) do
    with {:git, %GitRepository{} = git} <- {:git, refresh(git)},
         resp <- clone(git),
         cache <- Cache.refresh(cache),
         {{:ok, %GitRepository{health: :pullable} = git}, cache} <- {save_status(resp, git), cache} do
      {:noreply, %{state | git: git, cache: store_cache(cache)}}
    else
      {:git, nil} ->
        {:stop, {:shutdown, :normal}, state}
      {{:ok, %GitRepository{url: url, health: :failed} = git}, cache} ->
        Logger.info "failed to clone #{url}, retrying in 30 seconds"
        Process.send_after(self(), :clone, :timer.seconds(30))
        {:noreply, %{state | git: git, cache: cache}}
      err ->
        Logger.info "unknown git failure: #{inspect(err)}"
        {:stop, {:shutdown, :unknown}, state}
    end
  end

  def handle_info(:pull, %State{git: git, cache: cache} = state) do
    try do
      with {:git, %GitRepository{} = git} <- {:git, refresh(git)},
           {:pullable, true} <- {:pullable, should_pull?(state)},
           res <- fetch(git),
           {:ok, git} <- save_status(res, git),
           cache <- refresh(git, cache) do
        {:noreply, %State{git: git, cache: store_cache(cache), last_pull: Timex.now()}}
      else
        {:git, nil} -> {:stop, {:shutdown, :normal}, state}
        {:pullable, _} -> {:noreply, state}
        err ->
          Logger.info "unknown failure: #{inspect(err)}"
          {:noreply, state}
      end
    after
      schedule_pull()
    end
  end

  def handle_info({:touch, %Cache.Line{} = line}, %State{cache: cache} = state),
    do: {:noreply, %{state | cache: store_cache(Cache.touch(cache, line))}}

  def handle_info(:move, %State{git: git} = state) do
    case Git.Discovery.local?(git) do
      true -> {:noreply, state}
      false -> {:stop, {:shutdown, :moved}, state}
    end
  end

  def handle_info(_, state), do: {:noreply, state}

  def terminate(_, %State{git: git}) do
    :ets.delete(:git_cache, self())
    :telemetry.execute(metric_scope(:git_agent), %{count: 1}, %{url: git.url})
  end
  def terminate(_, _), do: :ok

  defp refresh(%GitRepository{} = repo) do
    with %GitRepository{} = git <- Repo.get(GitRepository, repo.id) |> Repo.preload([:connection]),
         git = Map.merge(git, Map.take(repo, [:private_key_file, :dir])),
         {:ok, git} <- refresh_key(git),
      do: git
  end

  defp refresh(%GitRepository{health: :pullable} = git, cache), do: Cache.refresh(%{cache | git: git})
  defp refresh(_, cache), do: cache

  defp save_status({:ok, _}, git), do: Git.status(git, %{health: :pullable, pulled_at: Timex.now(), error: nil})
  defp save_status({:error, err}, git), do: Git.status(git, %{health: :failed, error: err})

  defp schedule_pull(), do: Process.send_after(self(), :pull, @poll + jitter())

  defp should_pull?(%State{last_pull: nil}), do: true
  defp should_pull?(%State{last_pull: last_pull}) do
    Timex.shift(Timex.now(), seconds: -60)
    |> Timex.after?(last_pull)
  end

  defp jitter() do
    seconds = :rand.uniform(@jitter)
              |> :timer.seconds()
    seconds - @jitter_offset
  end

  defp get_cache(pid) do
    case :ets.lookup(:git_cache, pid) do
      [{^pid, cache}] -> {:ok, cache}
      _ -> {:error, :not_found}
    end
  end

  defp store_cache(pid \\ self(), cache) do
    :ets.insert(:git_cache, {pid, cache})
    cache
  end
end
