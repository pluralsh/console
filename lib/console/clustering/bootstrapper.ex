defmodule Console.Bootstrapper do
  use GenServer
  alias Console.Commands.{Tee, Command}
  require Logger

  defmodule State, do: defstruct [:storage, :ref, :output, :cloned]

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    Process.flag(:trap_exit, true)
    if Console.conf(:initialize) do
      send self(), :init
    end
    # send self(), :cluster
    {:ok, %State{storage: Console.storage(), ref: make_ref()}}
  end

  def kick(), do: GenServer.cast(__MODULE__, :start)

  def status(), do: GenServer.call(__MODULE__, :status)

  def git_enabled?() do
    case {status(), Console.conf(:initialize)} do
      {%{cloned: true}, _} -> true
      {_, true} -> false
      _ -> true
    end
  end

  def handle_call(:status, _, %State{cloned: cloned, output: output} = state),
    do: {:reply, %{cloned: cloned, output: output}, state}

  def handle_info(:init, %State{storage: storage} = state) do
    tee = Tee.new()
    Command.set_build(tee)
    case storage.init() do
      {:ok, _} -> {:noreply, %{state | cloned: true, output: ""}}
      {:error, out} ->
        IO.inspect(out)
        {:noreply, %{state | cloned: false, output: Tee.output(out)}}
    end
  end

  def handle_info(_, state), do: {:noreply, state}
end
