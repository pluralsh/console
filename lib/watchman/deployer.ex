defmodule Watchman.Deployer do
  use GenServer
  alias Watchman.Commands.{Plural, Command}
  alias Watchman.Services.Builds
  alias Watchman.Schema.Build
  require Logger

  @poll_interval 10_000
  @group :deployer

  @via {:via, :evel_name, :deployer}

  defmodule State, do: defstruct [:storage, :ref, :pid, :build, :id, :timer]

  def start(storage) do
    GenServer.start(__MODULE__, storage)
  end

  def start_link(_opts \\ :ok) do
    GenServer.start_link(__MODULE__, Watchman.storage(), name: __MODULE__)
  end

  def init(storage) do
    Process.flag(:trap_exit, true)
    Logger.info "Starting deployer"
    :pg2.create(@group)
    :pg2.join(@group, self())

    case :evel_name.register_name(:deployer, self()) do
      :yes ->
        broadcast({:leader, self()})
        send(self(), :start)
      :no ->
        pid = :evel_name.whereis_name(:deployer)
        broadcast({:leader, pid})
        Process.link(pid)
    end

    {:ok, %State{storage: storage, id: Ecto.UUID.generate()}}
  end

  def wake(), do: GenServer.call(@via, :poll)

  def cancel(), do: GenServer.call(@via, :cancel)

  def state(), do: GenServer.call(@via, :state)

  def update(repo, content, tool), do: GenServer.call(@via, {:update, repo, content, tool})

  def handle_call(:poll, _, %State{} = state) do
    send(self(), :poll)
    {:reply, :ok, state}
  end

  def handle_call({:update, repo, content, tool}, _, %State{storage: storage} = state) do
    {:reply, update(storage, repo, content, tool), state}
  end

  def handle_call(:cancel, _, %State{pid: nil} = state), do: {:reply, :ok, state}
  def handle_call(:cancel, _, %State{pid: pid} = state) when is_pid(pid) do
    Logger.info "Cancelling build with proc: #{inspect(pid)}"
    GenServer.stop(pid, {:shutdown, :cancel})
    {:reply, :ok, state}
  end

  def handle_call(:state, _, state), do: {:reply, state, state}

  def handle_cast(:sync, %State{storage: storage} = state) do
    storage.init()
    {:noreply, state}
  end

  def handle_cast({:leader, leader}, %{timer: nil} = state) do
    Process.link(leader)
    {:noreply, state}
  end

  def handle_cast({:leader, leader}, %{timer: timer} = state) do
    case leader == self() do
      true -> {:noreply, state}
      _ ->
        {:ok, _} = :timer.cancel(timer)
        Process.link(leader)
        {:noreply, %{state | timer: nil}}
    end
  end

  def handle_info(:start, state) do
    case Watchman.conf(:initialize) do
      true ->
        {:ok, ref} = :timer.send_interval(@poll_interval, :poll)
        {:noreply, %{state | timer: ref}}
      _ -> {:noreply, state}
    end
  end

  def handle_info(:poll, %State{pid: nil, storage: storage} = state) do
    Logger.info "Checking for pending builds, pid: #{inspect(self())}, node: #{node()}"
    with %Build{} = build <- Builds.poll() do
      {pid, ref} = perform(storage, build)
      {:noreply, %{state | ref: ref, pid: pid, build: build}}
    else
      {:error, :locked} ->
        Logger.info "deployer is locked"
        {:noreply, state}
      _ ->
        Logger.info "No build found"
        {:noreply, state}
    end
  end

  def handle_info(:poll, %State{pid: pid} = state) when is_pid(pid) do
    Logger.info "Build #{inspect(pid)} already running"
    {:noreply, state}
  end

  def handle_info({:DOWN, ref, :process, _, _}, %State{ref: ref, build: build} = state) do
    Logger.info "tearing down build #{build.id}, proc: #{inspect(state.pid)}"
    broadcast()
    {:noreply, %{state | ref: nil, pid: nil, build: nil}}
  end

  def handle_info(_, state), do: {:noreply, state}

  def terminate(_, _), do: :ok

  defp perform(storage, %Build{repository: repo, type: :bounce} = build) do
    with_build(build, [{storage, :init, []}, {Plural, :bounce, [repo]}])
  end

  defp perform(storage, %Build{type: :deploy, repository: repo, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Plural, :build, [repo]},
      {Plural, :diff, [repo]},
      {Plural, :deploy, [repo]},
      {storage, :revise, [commit_message(message, repo)]},
      {storage, :push, []}
    ])
  end

  defp perform(storage, %Build{type: :approval, repository: repo, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Plural, :build, [repo]},
      {Plural, :diff, [repo]},
      :approval,
      {Plural, :deploy, [repo]},
      {storage, :revise, [commit_message(message, repo)]},
      {storage, :push, []}
    ])
  end

  defp update(storage, repo, content, tool) do
    Command.set_build(nil)
    with {:ok, _} <- storage.init(),
         {:ok, res} <- Watchman.Services.Plural.update_configuration(repo, content, tool),
         {:ok, _} <- storage.revise("updated configuration for #{tool} #{repo}"),
         {:ok, _} <- storage.push(),
         _ <- broadcast(),
      do: {:ok, res}
  end

  defp with_build(%Build{} = build, operations) do
    {:ok, pid} = Watchman.Runner.start_link(build, operations)
    Swarm.register_name(build.id, pid)
    Watchman.Runner.register(pid)
    ref = Process.monitor(pid)
    {pid, ref}
  end

  def broadcast(msg \\ :sync) do
    :pg2.get_members(@group)
    |> Enum.filter(& &1 != self())
    |> Enum.each(&GenServer.cast(&1, msg))
  end

  defp commit_message(nil, repo), do: "watchman deployment for #{repo}"
  defp commit_message(message, repo), do: "watchman deployment for #{repo} -- #{message}"
end
