defmodule Console.Deployments.Git.Agent do
  @moduledoc """
  Implements a git poller + git pull cache.  Caching behavior is delegated to `Console.Deployments.Git.Cache`
  and polling is done on a fixed interval, with the cache being refreshed after each poll.

  We can then initiate a file stream out of this agent, which supports cross-node streams in case a repo tarball
  fetch is served on a separate node as this agent.
  """
  use GenServer, restart: :transient
  import Console.Deployments.Git.Cmd
  alias Console.Repo
  alias Console.Prom.Metrics
  alias Console.Deployments.{Git.Cache, Git, Services}
  alias Console.Schema.{GitRepository, Service}

  require Logger

  @poll :timer.seconds(120)
  @jitter 15

  defmodule State, do: defstruct [:git, :cache]

  def registry(), do: __MODULE__

  def fetch(pid, %Service{} = svc), do: GenServer.call(pid, {:fetch, svc}, 30_000)
  def fetch(pid, %Service.Git{} = ref), do: GenServer.call(pid, {:fetch, ref}, 30_000)

  def digest(pid, %Service.Git{} = ref), do: GenServer.call(pid, {:digest, ref}, 30_000)

  def docs(pid, %Service{} = svc), do: GenServer.call(pid, {:docs, svc}, 30_000)

  def refs(pid), do: GenServer.call(pid, :refs, 30_000)

  def addons(pid), do: GenServer.call(pid, :addons, 30_000)

  def sha(pid, ref), do: GenServer.call(pid, {:sha, ref}, 30_000)

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
    Metrics.inc(:git_agent, repo.url)
    {:ok, %State{git: repo, cache: cache}}
  end

  def handle_call(:addons, _, %State{cache: cache} = state) do
    case Cache.fetch(cache, "main", "addons", &String.ends_with?(&1, "addon.yaml")) do
      {:ok, %Cache.Line{file: f}, cache} -> {:reply, File.open(f), %{state | cache: cache}}
      err -> {:reply, err, state}
    end
  end

  def handle_call({:docs, %Service{git: %{ref: ref}} = svc}, _, %State{cache: cache} = state) do
    case Cache.fetch(cache, ref, Service.docs_path(svc)) do
      {:ok, %Cache.Line{file: f}, cache} -> {:reply, File.open(f), %{state | cache: cache}}
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
    {:reply, result, %{state | cache: cache}}
  end

  def handle_call({:digest, %Service.Git{} = ref}, _, %State{cache: cache} = state) do
    case Cache.fetch(cache, ref) do
      {:ok, %Cache.Line{digest: sha}, cache} -> {:reply, {:ok, sha}, %{state | cache: cache}}
      err -> {:reply, err, state}
    end
  end

  def handle_call({:fetch, %Service.Git{} = ref}, _, %State{cache: cache} = state) do
    case Cache.fetch(cache, ref) do
      {:ok, %Cache.Line{file: f}, cache} -> {:reply, File.open(f), %{state | cache: cache}}
      err -> {:reply, err, state}
    end
  end

  def handle_call({:fetch, %Service{git: %Service.Git{} = ref} = svc}, _, %State{cache: cache} = state) do
    svc = Console.Repo.preload(svc, [:revision])
    with {:ok, %Cache.Line{file: f, sha: sha, message: msg}, cache} <- Cache.fetch(cache, ref),
         {:ok, _} <- Services.update_sha(svc, sha, msg) do
      {:reply, File.open(f), %{state | cache: cache}}
    else
      err -> {:reply, err, state}
    end
  end

  def handle_info(:clone, %State{git: git, cache: cache} = state) do
    with {:git, %GitRepository{} = git} <- {:git, refresh(git)},
         resp <- clone(git),
         cache <- Cache.refresh(cache),
         {{:ok, %GitRepository{health: :pullable} = git}, cache} <- {save_status(resp, git), cache} do
      {:noreply, %{state | git: git, cache: cache}}
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
          res <- fetch(git),
          {:ok, git} <- save_status(res, git),
          cache <- refresh(git, cache) do
        {:noreply, %State{git: git, cache: cache}}
      else
        {:git, nil} -> {:stop, {:shutdown, :normal}, state}
        err ->
          Logger.info "unknown failure: #{inspect(err)}"
          {:noreply, state}
      end
    after
      schedule_pull()
    end
  end

  def handle_info(:move, %State{git: git} = state) do
    case Git.Discovery.local?(git) do
      true -> {:noreply, state}
      false -> {:stop, {:shutdown, :moved}, state}
    end
  end

  def handle_info(_, state), do: {:noreply, state}

  def terminate(_, %State{git: git}) do
    Metrics.dec(:git_agent, git.url)
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

  defp jitter() do
    :rand.uniform(@jitter)
    |> :timer.seconds()
  end
end
