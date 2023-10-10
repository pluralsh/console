defmodule Console.Runner.Harakiri do
  @moduledoc """
  Spawns a runner for a build and stops the system when it terminates
  """
  use GenServer
  import Console.Deployer.Operations, only: [commit_message: 2]
  require Logger
  alias Console.Bootstrapper
  alias Console.Schema.Build
  alias Console.Services.Builds
  alias Console.Commands.Plural

  @poll :timer.seconds(10)

  defmodule State, do: defstruct [:build, :storage, :pid, :ref, :cloned, :running]

  def start_link([storage, build_id]) do
    GenServer.start_link(__MODULE__, {storage, build_id})
  end

  def init({storage, build_id}) do
    :timer.send_interval(@poll, :start)
    {:ok, %State{storage: storage, build: Builds.get!(build_id), cloned: false, running: false}}
  end

  def handle_info(:start, %State{cloned: true, running: false, storage: storage, build: %Build{repository: repo} = build} = state) do
    Logger.info "starting build"
    {:ok, pid} = Console.Runner.start(build, [
      {storage, :init, []},
      {Plural, :build, [repo]},
      {Plural, :diff, [repo]},
      {Plural, :deploy, [repo]},
      {Plural, :unlock_repo, [repo]},
      {storage, :revise, [commit_message(nil, repo)]},
      {storage, :push, []}
    ], storage)
    {:noreply, %{state | pid: pid, ref: Process.monitor(pid), running: true}}
  end

  def handle_info(:start, %State{cloned: false} = state) do
    Logger.info "git not cloned yet, waiting a bit"
    {:noreply, %{state | cloned: Bootstrapper.git_enabled?()}}
  end

  def handle_info({:DOWN, ref, :process, _, _}, %State{ref: ref, build: build} = state) do
    Logger.info "tearing down build #{build.id}, proc: #{inspect(state.pid)}"
    Builds.cancel(build)
    disconnect()
    :init.stop()
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp disconnect() do
    Logger.info "disconnecting from cluster"
    Node.list()
    |> Enum.each(&Node.disconnect/1)
  end
end
