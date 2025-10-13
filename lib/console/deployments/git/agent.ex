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
  alias Console.Deployments.{Git, Services}
  alias Console.Deployments.Git.{Cache, Supervisor}
  alias Console.Schema.{GitRepository, Service}

  require Logger

  @poll :timer.seconds(120)
  @timeout :timer.seconds(10)
  @limit 50
  @limit_interval :timer.seconds(1)

  defmodule State, do: defstruct [:git, :cache, :last_pull]

  def registry(), do: __MODULE__

  def fetch(pid, %Service{} = svc) do
    with {:ok, tid} <- Supervisor.table(pid),
         {:ok, %Cache.Line{file: f, sha: sha, digest: digest, message: msg} = line} <- Cache.get(tid, svc.git),
         _ <- touch(pid, line),
         {:ok, _} <- Services.update_sha(svc, sha, msg) do
      {:ok, opener(pid, f), digest}
    else
      _ -> rate_limited({:tar, pid}, fn -> GenServer.call(pid, {:fetch, svc}, @timeout) end)
    end
  end

  def fetch(pid, %Service.Git{} = ref) do
    with {:ok, tid} <- Supervisor.table(pid),
         {:ok, %Cache.Line{file: f, digest: digest} = line} <- Cache.get(tid, ref),
         _ <- touch(pid, line) do
      {:ok, opener(pid, f), digest}
    else
      _ -> rate_limited({:tar, pid}, fn -> GenServer.call(pid, {:fetch, ref}, @timeout) end)
    end
  end

  def digest(pid, %Service.Git{} = ref)  do
    with {:ok, tid} <- Supervisor.table(pid),
         {:ok, %Cache.Line{digest: sha} = line} <- Cache.get(tid, ref),
         _ <- touch(pid, line) do
      {:ok, sha}
    else
      _ -> rate_limited({:tar, pid}, fn -> GenServer.call(pid, {:digest, ref}, @timeout) end)
    end
  end

  def sha(pid, ref) do
    with {:ok, tid} <- Supervisor.table(pid),
         {:ok, sha} <- Cache.commit(tid, ref) do
      {:ok, sha}
    else
      _ -> rate_limited({:tar, pid}, fn -> GenServer.call(pid, {:sha, ref}, @timeout) end)
    end
  end

  def changes(pid, sha1, sha2, folder) do
    with {:ok, tid} <- Supervisor.table(pid),
         %Cache.Change{result: result} = change <- Cache.get_change(tid, sha1, sha2, folder),
         _ <- touch(pid, change) do
      result
    else
      _ -> rate_limited({:changes, pid}, fn ->
        GenServer.call(pid, {:changes, sha1, sha2, folder}, @timeout)
      end)
    end
  end

  def tags(pid), do: GenServer.call(pid, :tags, @timeout)

  def docs(pid, %Service{} = svc), do: GenServer.call(pid, {:docs, svc}, @timeout)

  def refs(pid), do: GenServer.call(pid, :refs, @timeout)

  def addons(pid), do: GenServer.call(pid, :addons, @timeout)

  def kick(pid), do: GenServer.call(pid, :pull, @timeout)

  def opener(pid, f), do: fn -> GenServer.call(pid, {:open, f}, @timeout) end

  def info(pid), do: GenServer.call(pid, :info)

  def start(%GitRepository{} = repo) do
    GenServer.start(__MODULE__, repo, name: via(repo))
  end

  def start_link([%GitRepository{} = repo]), do: start_link(repo)
  def start_link(%GitRepository{} = repo) do
    GenServer.start_link(__MODULE__, repo, name: via(repo))
  end

  defp via(%GitRepository{id: id}), do: {:via, Registry, {registry(), {:git, id}}}

  def local_agents(), do: :pg.get_local_members(__MODULE__)
  def all_agents(), do: :pg.get_members(__MODULE__)

  def init(repo) do
    {:ok, dir} = Briefly.create(directory: true)
    {:ok, repo} = save_private_key(%{repo | dir: dir})
    # :pg.join(__MODULE__, self())
    table = :ets.new(:git_cache_entries, [:set, :protected, read_concurrency: true])
    Supervisor.register(self(), table)
    cache = Cache.new(repo, table)
    schedule_pull()
    :timer.send_interval(poll_interval(), :move)
    send self(), :clone
    :telemetry.execute(metric_scope(:git_agent), %{count: 1}, %{url: repo.url})

    {:ok, %State{git: repo, cache: cache}}
  end

  def handle_call({:open, f}, _, %State{} = state), do: {:reply, File.open(f), state}

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

  def handle_call(:refs, _, %State{cache: %Cache{} = cache} = state) do
    refs = Cache.all_heads(cache)
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
      {:ok, %Cache.Line{file: f, digest: sha}, cache} ->
        {:reply, {:ok, opener(self(), f), sha}, %{state | cache: cache}}
      err -> {:reply, err, state}
    end
  end

  def handle_call({:fetch, %Service{git: %Service.Git{} = ref} = svc}, _, %State{cache: cache} = state) do
    svc = Console.Repo.preload(svc, [:revision])
    with {:ok, %Cache.Line{file: f, digest: digest, sha: sha, message: msg}, cache} <- Cache.fetch(cache, ref),
         {:ok, _} <- Services.update_sha(svc, sha, msg) do
      {:reply, {:ok, opener(self(), f), digest}, %{state | cache: cache}}
    else
      err -> {:reply, err, state}
    end
  end

  def handle_call(:info, _, %State{} = state), do: {:reply, state, state}

  def handle_call(:tags, _, %State{cache: cache} = state),
    do: {:reply, Cache.tags(cache), state}

  def handle_call(:pull, _, %State{} = state) do
    {_, state} = handle_info(:pull, state)
    {:reply, :ok, state}
  end

  def handle_info(:clone, %State{git: git, cache: cache} = state) do
    with {:git, %GitRepository{} = git} <- {:git, refresh(git)},
         resp <- clone(git),
         cache <- Cache.refresh(cache),
         {{:ok, %GitRepository{health: :pullable} = git}, cache} <- {save_status(resp, git), %{cache | git: git}} do
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
           {:pullable, {true, _}} <- {:pullable, {should_pull?(state), git}},
           res <- fetch(git),
           {:ok, git} <- save_status(res, git),
           cache <- refresh(git, cache) do
        {:noreply, %State{git: git, cache: %{cache | git: git}, last_pull: Timex.now()}}
      else
        {:git, nil} -> {:stop, {:shutdown, :normal}, state}
        {:pullable, {_, git}} -> {:noreply, %{state | git: git, cache: %{cache | git: git}}}
        err ->
          Logger.info "unknown failure: #{inspect(err)}"
          {:noreply, state}
      end
    after
      schedule_pull()
    end
  end

  def handle_info({:touch, line}, %State{cache: cache} = state),
    do: {:noreply, %{state | cache: Cache.touch(cache, line)}}

  def handle_info(:move, %State{git: git} = state) do
    case Git.Discovery.local?(git) do
      true -> {:noreply, state}
      false ->
        Logger.info "git repository moved: #{git.url}"
        {:stop, {:shutdown, :moved}, state}
    end
  end

  def handle_info(_, state), do: {:noreply, state}

  def terminate(_, %State{git: git}) do
    Supervisor.deregister(self())
    :telemetry.execute(metric_scope(:git_agent), %{count: 1}, %{url: git.url})
  end
  def terminate(_, _), do: :ok

  defp refresh(%GitRepository{} = repo) do
    with %GitRepository{} = git <- Repo.get(GitRepository, repo.id) |> Repo.preload([:connection]),
         git = Map.merge(git, Map.take(repo, ~w(private_key_file dir prev_private_key)a)),
         {:ok, git} <- refresh_key(git),
      do: git
  end

  defp touch(pid, line), do: send(pid, {:touch, line})

  defp rate_limited(key, fun) when is_function(fun, 0) do
    :erlang.term_to_binary(key)
    |> Hammer.check_rate(@limit_interval, @limit)
    |> case do
      {:allow, _} -> fun.()
      {:deny, _} -> {:error, :rate_limited}
    end
  end

  defp refresh(%GitRepository{health: :pullable} = git, cache), do: Cache.refresh(%{cache | git: git})
  defp refresh(_, cache), do: cache

  defp save_status({:ok, _}, git), do: Git.status(git, %{health: :pullable, pulled_at: Timex.now(), error: nil})
  defp save_status({:error, err}, git), do: Git.status(git, %{health: :failed, error: err})

  defp schedule_pull() do
    poll = poll_interval()
    Process.send_after(self(), :pull, poll + Console.jitter(ceil(poll / 2)))
  end

  defp should_pull?(%State{last_pull: nil}), do: true
  defp should_pull?(%State{last_pull: last_pull}) do
    Timex.shift(Timex.now(), seconds: -5)
    |> Timex.after?(last_pull)
  end

  defp poll_interval(), do: Console.conf(:git_poll_interval) || @poll
end
