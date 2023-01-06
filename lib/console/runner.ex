defmodule Console.Runner do
  use GenServer
  alias Console.Commands.{Command}
  alias Console.Services.Builds

  defmodule State, do: defstruct [:build, :operations, :storage]

  def start_link(build, operations, storage) do
    GenServer.start_link(__MODULE__, {build, operations, storage})
  end

  def start(build, operations, storage) do
    GenServer.start(__MODULE__, {build, operations, storage})
  end

  def kick(), do: Swarm.publish(:builds, :kick)

  def ping(pid), do: GenServer.call(pid, :ping)

  def register(pid), do: Swarm.join(:builds, pid)

  def init({build, operations, storage}) do
    Process.flag(:trap_exit, true)
    Command.set_build(build)
    send self(), :kick
    {:ok, %State{build: build, operations: operations, storage: storage}}
  end

  def handle_call(:ping, _, %State{operations: ops} = state), do: {:reply, {:pong, ops}, state}

  def handle_info(:kick, %State{operations: []} = state), do: {:stop, {:shutdown, :succeed}, state}

  def handle_info(:kick, %State{operations: [:approval | ops], build: build} = state) do
    {:ok, build} = Builds.pending(build)
    {:noreply, %{state | operations: ops, build: build}}
  end

  def handle_info(:kick, %State{operations: [{m, f, a} | ops], build: build, storage: storage} = state) do
    {:ok, build} = Builds.running(build)
    case apply(m, f, a) do
      :ok -> continue(state, ops, build)
      {:ok, _} -> continue(state, ops, build)
      _ ->
        storage.reset()
        {:stop, {:shutdown, :fail}, state}
    end
  end

  def handle_info(_, state), do: {:noreply, state}

  defp continue(state, [], _), do: {:stop, {:shutdown, :succeed}, state}
  defp continue(state, ops, build) do
    send self(), :kick
    {:noreply, %{state | operations: ops, build: build}}
  end

  def terminate({:shutdown, :succeed}, %{build: build}), do: Builds.succeed(build)
  def terminate({:shutdown, :fail}, %{build: build}), do: Builds.fail(build)
  def terminate(_, %{build: build}), do: Builds.cancel(build)
end
