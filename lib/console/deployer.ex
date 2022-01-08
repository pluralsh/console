defmodule Console.Deployer do
  use GenServer
  alias Console.Commands.{Plural, Command}
  alias Console.Services.Builds
  alias Console.Schema.Build
  alias Console.Plural.Context
  require Logger

  @poll_interval 10_000
  @group :deployer

  defmodule State, do: defstruct [:storage, :ref, :pid, :build, :id, :timer, :leader]

  def start(storage) do
    GenServer.start(__MODULE__, storage)
  end

  def start_link(_opts \\ :ok) do
    GenServer.start_link(__MODULE__, Console.storage(), name: __MODULE__)
  end

  def init(storage) do
    Process.flag(:trap_exit, true)
    Logger.info "Starting deployer"
    :pg2.create(@group)
    :pg2.join(@group, self())
    {:ok, ref} = :timer.send_interval(@poll_interval, :poll)
    send self(), :init
    if Console.conf(:initialize) do
      :timer.send_interval(:timer.minutes(2), :sync)
    end
    {:ok, %State{storage: storage, id: Ecto.UUID.generate(), ref: ref}}
  end

  def wake(), do: GenServer.call(__MODULE__, :poll)

  def cancel(), do: GenServer.call(__MODULE__, :cancel)

  def state(), do: GenServer.call(__MODULE__, :state)

  def ping(), do: GenServer.call(__MODULE__, :ping)

  def update(repo, content, tool), do: GenServer.call(__MODULE__, {:update, repo, content, tool})

  def exec(fun), do: GenServer.call(__MODULE__, {:exec, fun})

  def handle_call(:poll, _, %State{} = state) do
    send(self(), :poll)
    {:reply, :ok, state}
  end

  def handle_call({:update, repo, content, tool}, _, %State{storage: storage} = state) do
    {:reply, update(storage, repo, content, tool), state}
  end

  def handle_call({:exec, fun}, _, state) when is_function(fun) do
    res = fun.(state.storage)
    broadcast()
    {:reply, res, state}
  end

  def handle_call(:ping, _, state), do: {:reply, :pong, state}

  def handle_call(:cancel, _, state) do
    Logger.info "Attempting to cancel build"
    with %{id: id} <- Builds.get_running(),
      do: GenServer.stop({:via, :swarm, id}, {:shutdown, :cancel})
    {:reply, :ok, state}
  end

  def handle_call(:state, _, state), do: {:reply, state, state}

  def handle_cast(:sync, %State{ref: ref} = state) when not is_nil(ref), do: {:noreply, state}
  def handle_cast(:sync, %State{storage: storage} = state) do
    Logger.info "Resyncing git state"
    storage.init()
    {:noreply, state}
  end

  def handle_info(:sync, state), do: handle_cast(:sync, state)

  def handle_info(:init, %State{} = state) do
    {:noreply, state}
  end

  def handle_info(:poll, %State{pid: nil, storage: storage, id: id} = state) do
    Logger.info "Checking for pending builds, pid: #{inspect(self())}, node: #{node()}"
    with {:ok, %Build{} = build} <- Builds.poll(id) do
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
    {:noreply, ping(state)}
  end

  def handle_info({:DOWN, ref, :process, _, _}, %State{ref: ref, build: build} = state) do
    Logger.info "tearing down build #{build.id}, proc: #{inspect(state.pid)}"
    Builds.cancel(build)
    broadcast()
    send(self(), :poll)
    {:noreply, %{state | ref: nil, pid: nil, build: nil}}
  end

  def handle_info(_, state), do: {:noreply, state}

  def terminate(state, reason) do
    Logger.info "Terminating with state: #{inspect(state)} reason #{inspect(reason)}"
    :ok
  end

  defp perform(storage, %Build{repository: repo, type: :bounce} = build) do
    with_build(build, [{storage, :init, []}, {Plural, :bounce, [repo]}], storage)
  end

  defp perform(storage, %Build{type: :deploy, repository: repo, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Plural, :build, [repo]},
      {Plural, :diff, [repo]},
      {Plural, :deploy, [repo]},
      {storage, :revise, [commit_message(message, repo)]},
      {storage, :push, []}
    ], storage)
  end

  defp perform(storage, %Build{type: :install, context: %{"configuration" => conf, "bundle" => b}, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Context, :merge, [conf, %Context.Bundle{repository: b["repository"], name: b["name"]}]},
      {Plural, :build, []},
      {Plural, :install, []},
      {storage, :revise, [commit_message(message, b["repository"])]},
      {storage, :push, []}
    ], storage)
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
    ], storage)
  end

  defp update(storage, repo, content, tool) do
    Command.set_build(nil)
    with {:ok, _} <- storage.init(),
         {:ok, res} <- Console.Services.Plural.update_configuration(repo, content, tool),
         {:ok, _} <- storage.revise("updated configuration for #{tool} #{repo}"),
         {:ok, _} <- storage.push(),
         _ <- broadcast(),
      do: {:ok, res}
  end

  defp with_build(%Build{} = build, operations, storage) do
    {:ok, pid} = Console.Runner.start_link(build, operations, storage)
    Swarm.register_name(build.id, pid)
    Console.Runner.register(pid)
    ref = Process.monitor(pid)
    {pid, ref}
  end

  defp ping(%State{build: %Build{} = build} = state) do
    case Builds.ping(build) do
      {:ok, build} -> %{state | build: build}
      _ -> state
    end
  end
  defp ping(state), do: state

  def broadcast(msg \\ :sync) do
    :pg2.get_members(@group)
    |> Enum.filter(& &1 != self())
    |> Enum.each(&GenServer.cast(&1, msg))
  end

  defp commit_message(nil, repo), do: "console deployment for #{repo}"
  defp commit_message(message, repo), do: "console deployment for #{repo} -- #{message}"
end
