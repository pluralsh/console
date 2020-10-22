defmodule Watchman.Deployer do
  use GenServer
  alias Watchman.Commands.{Forge, Command}
  alias Watchman.Services.Builds
  alias Watchman.Schema.Build
  require Logger

  @poll_interval 10_000

  defmodule State, do: defstruct [:storage, :ref, :pid, :build]

  def start(storage) do
    GenServer.start(__MODULE__, storage)
  end

  def start_link(storage) do
    GenServer.start_link(__MODULE__, storage)
  end

  def init(storage) do
    Process.flag(:trap_exit, true)
    if Watchman.conf(:initialize) do
      :timer.send_interval @poll_interval, :poll
    end
    Logger.info "Starting deployer"

    {:ok, %State{storage: storage}}
  end

  def pid() do
    {:ok, pid, _} = Watchman.Cluster.call(:fetch)
    pid
  end

  def wake(), do: GenServer.call(pid(), :poll)

  def cancel(), do: GenServer.call(pid(), :cancel)

  def state(), do: GenServer.call(pid(), :state)

  def update(repo, content), do: GenServer.call(pid(), {:update, repo, content})

  def handle_call(:poll, _, %State{} = state) do
    send self(), :poll
    {:reply, :ok, state}
  end

  def handle_call({:update, repo, content}, _, %State{storage: storage} = state) do
    {:reply, update(storage, repo, content), state}
  end

  def handle_call(:cancel, _, %State{pid: nil} = state), do: {:reply, :ok, state}
  def handle_call(:cancel, _, %State{pid: pid} = state) when is_pid(pid) do
    Logger.info "Cancelling build with proc: #{inspect(pid)}"
    GenServer.stop(pid, {:shutdown, :cancel})
    {:reply, :ok, state}
  end

  def handle_call(:state, _, state), do: {:reply, state, state}

  def handle_info(:poll, %State{storage: storage, ref: nil} = state) do
    Logger.info "Checking for pending builds, pid: #{inspect(self())}, node: #{node()}"
    case Builds.poll() do
      nil -> {:noreply, state}
      %Build{} = build ->
        {pid, ref} = perform(storage, build)
        {:noreply, %{state | ref: ref, pid: pid, build: build}}
    end
  end

  def handle_info({:DOWN, ref, :process, _, _}, %State{ref: ref, build: build} = state) do
    Logger.info("tearing down build #{build.id}, proc: #{inspect(state.pid)}")
    {:noreply, %{state | ref: nil, pid: nil, build: nil}}
  end

  def handle_info(_, state), do: {:noreply, state}

  def terminate(_, _), do: :ok

  defp perform(storage, %Build{repository: repo, type: :bounce} = build) do
    with_build(build, [{storage, :init, []}, {Forge, :bounce, [repo]}])
  end

  defp perform(storage, %Build{type: :deploy, repository: repo, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Forge, :build, [repo]},
      {Forge, :diff, [repo]},
      {Forge, :deploy, [repo]},
      {storage, :revise, [commit_message(message, repo)]},
      {storage, :push, []}
    ])
  end

  defp perform(storage, %Build{type: :approval, repository: repo, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Forge, :build, [repo]},
      {Forge, :diff, [repo]},
      :approval,
      {Forge, :deploy, [repo]},
      {storage, :revise, [commit_message(message, repo)]},
      {storage, :push, []}
    ])
  end

  defp update(storage, repo, content) do
    Command.set_build(nil)
    with {:ok, _} <- storage.init(),
         {:ok, res} <- Watchman.Services.Forge.update_configuration(repo, content),
         {:ok, _} <- storage.revise("updated configuration for #{repo}"),
         {:ok, _} <- storage.push(),
      do: {:ok, res}
  end

  defp with_build(%Build{} = build, operations) do
    {:ok, pid} = Watchman.Runner.start_link(build, operations)
    Swarm.register_name(build.id, pid) |> IO.inspect()
    Watchman.Runner.register(pid)
    ref = Process.monitor(pid)
    {pid, ref}
  end

  defp commit_message(nil, repo), do: "watchman deployment for #{repo}"
  defp commit_message(message, repo), do: "watchman deployment for #{repo} -- #{message}"
end