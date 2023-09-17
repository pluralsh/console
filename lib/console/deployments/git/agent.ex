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

  def fetch(pid, %Service{} = svc), do: GenServer.call(pid, {:fetch, svc}, 10_000)

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
    :timer.send_interval(@poll, :pull)
    :timer.send_interval(@poll, :move)
    send self(), :clone
    {:ok, %State{git: repo, cache: cache}}
  end

  def handle_call({:fetch, %Service{git: %{ref: ref, folder: path}} = svc}, _, %State{cache: cache} = state) do
    with {:ok, sha, f} <- Cache.fetch(cache, ref, path),
         {:ok, _} <- Services.update_sha(svc, sha) do
      {:reply, {:ok, File.stream!(f)}, state}
    else
      err -> {:reply, err, state}
    end
  end

  def handle_info(:clone, %State{git: git} = state) do
    clone(git)
    |> save_status(git)
    |> case do
      {:ok, %GitRepository{health: :failed}} ->
        {:stop, {:shutdown, :credentials}, state}
      {:ok, git} -> {:noreply, %{state | git: git}}
      err ->
        Logger.info "unknown git failure: #{inspect(err)}"
        {:stop, {:shutdown, :unknown}, state}
    end
  end

  def handle_info(:pull, %State{git: git, cache: cache} = state) do
    with res <- fetch(git),
         {:ok, git} <- save_status(res, git),
         cache <- refresh(git, cache) do
      {:noreply, %State{git: git, cache: cache}}
    else
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

  defp refresh(%GitRepository{health: :pullable} = git, cache), do: Cache.refresh(%{cache | git: git})
  defp refresh(_, cache), do: cache

  defp save_status({:ok, _}, git), do: Git.status(git, %{health: :pullable, pulled_at: Timex.now(), error: nil})
  defp save_status({:error, err}, git), do: Git.status(git, %{health: :failed, error: err})
end
