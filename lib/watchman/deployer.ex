defmodule Watchman.Deployer do
  use GenServer
  alias Watchman.Commands.{Forge, Command}
  alias Watchman.Services.Builds
  alias Watchman.Schema.Build
  require Logger

  @poll_interval 10_000
  @group :deployer
  @lock "deployer"

  defmodule State, do: defstruct [:storage, :ref, :pid, :build, :id]

  def start(storage) do
    GenServer.start(__MODULE__, storage)
  end

  def start_link(_opts \\ :ok) do
    GenServer.start_link(__MODULE__, Watchman.storage(), name: __MODULE__)
  end

  def init(storage) do
    Process.flag(:trap_exit, true)
    if Watchman.conf(:initialize) do
      :timer.send_interval @poll_interval, :poll
    end
    Logger.info "Starting deployer"
    :pg2.create(@group)
    :pg2.join(@group, self())

    {:ok, %State{storage: storage, id: Ecto.UUID.generate()}}
  end

  def wake(), do: GenServer.call(__MODULE__, :poll)

  def cancel(), do: GenServer.call(__MODULE__, :cancel)

  def state(), do: GenServer.call(__MODULE__, :state)

  def update(repo, content), do: GenServer.call(__MODULE__, {:update, repo, content})

  def handle_call(:poll, _, %State{} = state) do
    send self(), :poll
    {:reply, :ok, state}
  end

  def handle_call({:update, repo, content}, _, %State{storage: storage} = state) do
    {:reply, update(storage, repo, content), state}
  end

  def handle_call(:cancel, _, %State{pid: nil} = state), do: {:reply, :ok, state}
  def handle_call(:cancel, _, %State{pid: pid, id: id} = state) when is_pid(pid) do
    Logger.info "Cancelling build with proc: #{inspect(pid)}"
    GenServer.stop(pid, {:shutdown, :cancel})
    Builds.unlock(@lock, id)
    {:reply, :ok, state}
  end

  def handle_call(:state, _, state), do: {:reply, state, state}

  def handle_cast(:sync, %State{storage: storage} = state) do
    storage.init()
    {:noreply, state}
  end

  def handle_info(:poll, %State{storage: storage, id: id} = state) do
    with {:ok, _} <- Builds.lock(@lock, id),
         _ <- Logger.info("Checking for pending builds, pid: #{inspect(self())}, node: #{node()}"),
         %Build{} = build <- Builds.poll() do
      {pid, ref} = perform(storage, build)
      {:noreply, %{state | ref: ref, pid: pid, build: build}}
    else
      {:error, :locked} ->
        Logger.info "deployer is locked"
        {:noreply, state}
      _ ->
        Logger.info "No build found"
        Builds.unlock(@lock, id)
        {:noreply, state}
    end
  end

  def handle_info({:DOWN, ref, :process, _, _}, %State{ref: ref, build: build, id: id} = state) do
    Logger.info("tearing down build #{build.id}, proc: #{inspect(state.pid)}")
    Builds.unlock(@lock, id)
    broadcast()
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

  def broadcast() do
    :pg2.get_members(@group)
    |> Enum.filter(& &1 != self())
    |> Enum.each(&GenServer.cast(&1, :sync))
  end

  defp commit_message(nil, repo), do: "watchman deployment for #{repo}"
  defp commit_message(message, repo), do: "watchman deployment for #{repo} -- #{message}"
end