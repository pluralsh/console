defmodule Console.Deployer do
  use GenServer
  import Console.Deployer.Operations

  alias Kazan.Apis.Batch.V1, as: BatchV1
  alias Kazan.Watcher
  alias Console.Bootstrapper
  alias Console.Deployer.Dedicated
  alias Console.Commands.Command
  alias Console.Services.{Builds, Users, LeaderElection}
  alias Console.Schema.Build
  require Logger

  @call_timeout :timer.seconds(10)
  @poll_interval 10_000
  @group :deployer
  @leader "deployer"

  defmodule State, do: defstruct [:storage, :ref, :pid, :build, :id, :timer, :leader, :job, cloned: false]

  def start(storage) do
    GenServer.start(__MODULE__, storage)
  end

  def start_link(_opts \\ :ok) do
    GenServer.start_link(__MODULE__, Console.storage(), name: __MODULE__)
  end

  def init(storage) do
    Process.flag(:trap_exit, true)
    Logger.info "Starting deployer"
    :pg.start(@group)
    :pg.join(@group, self())
    if Console.conf(:initialize) do
      {:ok, _} = :timer.send_interval(@poll_interval, :poll)
      :timer.send_interval(:timer.minutes(2), :sync)
    end
    {:ok, %State{storage: storage, id: Ecto.UUID.generate(), cloned: Bootstrapper.git_enabled?()}}
  end

  def me(), do: {__MODULE__, node()}

  def elect() do
    Logger.info "attempting to elect #{inspect(me())} as leader"
    LeaderElection.elect(me(), @leader)
  end

  def leader() do
    case LeaderElection.get(@leader) do
      %{ref: ref} -> ref
      _ -> __MODULE__
    end
  end

  def leader?() do
    case {me(), leader()} do
      {l, l} -> true
      {_, __MODULE__} -> true
      _ -> false
    end
  end

  def file(path), do: GenServer.call(leader(), {:file, path}, @call_timeout)

  def wake(), do: GenServer.call(leader(), :poll, @call_timeout)

  def cancel(), do: GenServer.call(leader(), :cancel, @call_timeout)

  def state(), do: GenServer.call(leader(), :state, @call_timeout)

  def ping(), do: GenServer.call(leader(), :ping, @call_timeout)

  def update(repo, content, tool, msg \\ nil, actor \\ nil) do
    GenServer.call(leader(), {:update, repo, content, tool, msg, actor}, @call_timeout)
  end

  def exec(fun), do: GenServer.call(leader(), {:exec, fun}, @call_timeout)

  def handle_call({:file, path}, _, state) do
    {:reply, File.read(path), state}
  end

  def handle_call(:poll, _, %State{} = state) do
    send(self(), :poll)
    {:reply, :ok, state}
  end

  def handle_call({:update, _, _, _, _, _}, _, %State{pid: pid} = state) when is_pid(pid),
    do: {:reply, {:error, "cannot update configuration when deployment is in progress"}, state}

  def handle_call({:update, repo, content, tool, msg, actor}, _, %State{storage: storage} = state) do
    {:reply, update(storage, repo, content, tool, msg, actor), state}
  end

  def handle_call({:exec, fun}, _, state) when is_function(fun) do
    res = fun.(state.storage)
    broadcast()
    {:reply, res, state}
  end

  def handle_call(:ping, _, state), do: {:reply, :pong, state}

  def handle_call(:cancel, _, %State{job: %BatchV1.Job{} = job} = state) do
    Logger.info "cancelling build job"
    Dedicated.cancel_job(job)
    {:reply, :ok, state}
  end

  def handle_call(:cancel, _, %State{pid: pid} = state) when is_pid(pid) do
    Logger.info "Attempting to cancel build proc: #{inspect(pid)}"
    GenServer.stop(pid, {:shutdown, :cancel})
    {:reply, :ok, state}
  end

  def handle_call(:cancel, _, state), do: {:reply, :ok, state}

  def handle_call(:state, _, state), do: {:reply, state, state}

  def handle_cast(:sync, %State{ref: nil, storage: storage} = state) do
    Logger.info "Resyncing git state"
    storage.init()
    storage.doctor()
    {:noreply, state}
  end
  def handle_cast(:sync, state), do: {:noreply, state}

  def handle_info(:sync, state), do: handle_cast(:sync, state)

  def handle_info(:poll, %State{cloned: false} = state) do
    {:noreply, %{state | cloned: Bootstrapper.git_enabled?()}}
  end

  def handle_info(:poll, %State{pid: nil, storage: storage, id: id} = state) do
    Logger.info "Checking for pending builds, pid: #{inspect(self())}, node: #{node()}"
    with {:ok, _} <- elect(),
         {:ok, %Build{} = build} <- Builds.poll(id),
         {:perform, {:ok, pid, ref}, _} <- {:perform, perform(storage, build), build} do
      {:noreply, %{state | ref: ref, pid: pid, build: build}}
    else
      {:perform, error, build} ->
        Logger.error "failed to execute build, error: #{inspect(error)}"
        Builds.fail(build)
        {:noreply, state}
      {:error, :locked} ->
        Logger.info "deployer is locked"
        {:noreply, state}
      {:error, :following} ->
        Logger.info "#{node()} is a follower"
        {:noreply, state}
      _ ->
        Logger.info "No build found"
        {:noreply, state}
    end
  end

  def handle_info(:poll, %State{pid: pid} = state) when is_pid(pid) do
    Logger.info "Build #{inspect(pid)} already running"
    elect()
    {:noreply, ping(state)}
  end

  def handle_info(%Watcher.Event{object: %BatchV1.Job{}, type: :deleted}, %State{build: build} = state) do
    Logger.info "build k8s job deleted, cancelling"
    Builds.cancel(build)
    flush_job(state)
  end

  def handle_info(%Watcher.Event{object: %BatchV1.Job{} = job}, %State{build: build, pid: pid} = state) do
    Logger.info "Found k8s job update: #{inspect(job)}"
    case Console.Deployer.Dedicated.job_status(job) do
      :running ->
        Logger.info "job still running, ignoring for now"
        {:noreply, state}
      :done ->
        Logger.info "job completed, unblocking deployer #{inspect(self())}, job watcher: #{inspect(pid)}"
        Builds.cancel(build)
        Watcher.stop_watch(pid)
        flush_job(state)
    end
  end

  def handle_info({:DOWN, ref, :process, _, _}, %State{ref: ref, build: build} = state) do
    Logger.info "tearing down build #{build.id}, proc: #{inspect(state.pid)}"
    Builds.cancel(build)
    flush_job(state)
  end

  def handle_info(_, state), do: {:noreply, state}

  def terminate(state, reason) do
    Logger.info "Terminating with state: #{inspect(state)} reason #{inspect(reason)}"
    case LeaderElection.clear(me(), @leader) do
      {:ok, _} -> Logger.info "removed #{inspect(me())} as cluster leader"
      _ -> Logger.info "#{inspect(me())} is not leader, moving on"
    end
    :ok
  end

  defp flush_job(state) do
    broadcast()
    send(self(), :poll)
    {:noreply, %{state | ref: nil, pid: nil, build: nil}}
  end

  defp update(storage, repo, content, tool, msg, actor) do
    Command.set_build(nil)
    user = actor || Users.get_bot!("console")
    with {:ok, _} <- storage.init(),
         {:ok, res} <- Console.Services.Plural.update_configuration(repo, content, tool),
         {:ok, _} <- storage.revise(msg || "updated configuration for #{tool} #{repo}"),
         {:ok, _} <- storage.push(),
         {:ok, build} <- Builds.create(%{
          type: :deploy,
          repository: repo,
          message: "redeploying after #{tool} update for #{repo}",
        }, user),
         _ <- broadcast(),
      do: {:ok, res, build}
  end

  defp ping(%State{build: %Build{} = build} = state) do
    case Builds.ping(build) do
      {:ok, build} -> %{state | build: build}
      _ -> state
    end
  end
  defp ping(state), do: state

  def broadcast(msg \\ :sync) do
    :pg.get_members(@group)
    |> Enum.filter(& &1 != self())
    |> Enum.each(&GenServer.cast(&1, msg))
  end
end
