defmodule Watchman.Runner do
  use GenServer
  alias Watchman.Commands.{Command}
  alias Watchman.Services.Builds

  defmodule State, do: defstruct [:build, :operations]

  def start_link(build, operations) do
    GenServer.start_link(__MODULE__, {build, operations})
  end

  def kick(), do: Swarm.publish(:builds, :kick)

  def register(pid), do: Swarm.join(:builds, pid)

  def init({build, operations}) do
    Process.flag(:trap_exit, true)
    Command.set_build(build)
    send self(), :kick
    {:ok, %State{build: build, operations: operations}}
  end

  def handle_info(:kick, %State{operations: ops, build: build} = state) do
    case execute_stack(ops) do
      {:ok, _} -> {:stop, {:shutdown, :succeed}, state}
      {:approval, rest} ->
          {:ok, build} = Builds.pending(build)
          {:noreply, %{state | operations: rest, build: build}}
      _ -> {:stop, {:shutdown, :fail}, state}
    end
  end

  def terminate({:shutdown, :succeed}, %{build: build}), do: Builds.succeed(build)
  def terminate({:shutdown, :fail}, %{build: build}), do: Builds.fail(build)
  def terminate(_, %{build: build}), do: Builds.cancel(build)

  defp execute_stack(stack, last \\ :ok)
  defp execute_stack([:approval | rest], _), do: {:approval, rest}
  defp execute_stack([{m, f, a} | rest], _) do
    with {:ok, _} = last <- apply(m, f, a),
      do: execute_stack(rest, last)
  end
  defp execute_stack([], last), do: last
end