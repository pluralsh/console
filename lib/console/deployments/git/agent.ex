defmodule Console.Deployments.Git.Agent do
  @moduledoc """
  Implements a git poller + git pull cache.  Caching behavior is delegated to `Console.Deployments.Git.Cache`
  and polling is done on a fixed interval, with the cache being refreshed after each poll.

  We can then initiate a file stream out of this agent, which supports cross-node streams in case a repo tarball
  fetch is served on a separate node as this agent.
  """
  use GenServer
  import Console.Deployments.Git.Cmd
  alias Console.Deployments.{Git.Cache, Git, Services}
  alias Console.Schema.{GitRepository, Service}

  require Logger

  @poll :timer.seconds(60)

  defmodule State, do: defstruct [:git, :cache]

  def registry(), do: __MODULE__

  def fetch(pid, %Service{} = svc), do: GenServer.call(pid, {:fetch, svc}, 30_000)

  def docs(pid, %Service{} = svc), do: GenServer.call(pid, {:docs, svc}, 30_000)

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
    Process.send_after(self(), :pull, @poll)
    :timer.send_interval(@poll, :move)
    send self(), :clone
    {:ok, %State{git: repo, cache: cache}}
  end

  def handle_call({:docs, %Service{git: %{ref: ref}} = svc}, _, %State{cache: cache} = state) do
    case Cache.fetch(cache, ref, Service.docs_path(svc)) do
      {:ok, _, f} -> {:reply, File.open(f), state}
      err -> {:reply, err, state}
    end
  end

  def handle_call({:fetch, %Service{git: %{ref: ref, folder: path}} = svc}, _, %State{cache: cache} = state) do
    with {:ok, sha, f} <- Cache.fetch(cache, ref, path),
         {:ok, _} <- Services.update_sha(svc, sha) do
      {:reply, File.open(f), state}
    else
      err -> {:reply, err, state}
    end
  end

  def handle_info(:clone, %State{git: git} = state) do
    with {:git, %GitRepository{} = git} <- {:git, refresh(git)},
         resp <- clone(git),
         {:ok, %GitRepository{health: :pullable} = git} <- save_status(resp, git) do
      {:noreply, %{state | git: git}}
    else
      {:git, nil} -> {:stop, {:shutdown, :normal}, state}
      {:ok, %GitRepository{health: :failed}} ->
        {:stop, {:shutdown, :credentials}, state}
      err ->
        Logger.info "unknown git failure: #{inspect(err)}"
        {:stop, {:shutdown, :unknown}, state}
    end
  end

  def handle_info(:pull, %State{git: git, cache: cache} = state) do
    with {:git, %GitRepository{} = git} <- {:git, refresh(git)},
         res <- fetch(git),
         _ <- Process.send_after(self(), :pull, @poll),
         {:ok, git} <- save_status(res, git),
         cache <- refresh(git, cache) do
      {:noreply, %State{git: git, cache: cache}}
    else
      {:git, nil} -> {:stop, {:shutdown, :normal}, state}
      err ->
        Logger.info "unknown failure: #{inspect(err)}"
        {:noreply, state}
    end
  end

  def handle_info(:move, %State{git: git} = state) do
    case Git.Discovery.local?(git) do
      true -> {:noreply, state}
      false -> {:stop, {:shutdown, :moved}, state}
    end
  end

  def handle_info(_, state), do: {:noreply, state}

  defp refresh(%GitRepository{} = repo) do
    with %GitRepository{} = git <- Console.Repo.get(GitRepository, repo.id),
      do: Map.merge(git, Map.take(repo, [:private_key_file, :dir]))
  end

  defp refresh(%GitRepository{health: :pullable} = git, cache), do: Cache.refresh(%{cache | git: git})
  defp refresh(_, cache), do: cache

  defp save_status({:ok, _}, git), do: Git.status(git, %{health: :pullable, pulled_at: Timex.now(), error: nil})
  defp save_status({:error, err}, git), do: Git.status(git, %{health: :failed, error: err})
end
