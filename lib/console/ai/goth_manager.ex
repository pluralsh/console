defmodule Console.AI.GothManager do
  use GenServer

  defmodule State, do: defstruct [:credentials, :process, :monitor]

  def start_link(_ \\ :ok) do
    GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def init(_config) do
    {:ok, %State{}}
  end

  def fetch(creds), do: GenServer.call(__MODULE__, {:fetch, creds})

  def handle_call({:fetch, creds}, _, %State{credentials: creds} = state) do
    {:reply, Goth.fetch(__MODULE__), state}
  end

  def handle_call({:fetch, creds}, _, %State{process: pid} = state) do
    maybe_stop(pid)
    {:ok, pid} = Goth.start([name: __MODULE__] ++ creds)
    ref = Process.monitor(pid)
    {:reply, Goth.fetch(__MODULE__), %{state | monitor: ref, process: pid, credentials: creds}}
  end

  def handle_info({:DOWN, ref, :process, pid, _}, %State{monitor: ref, process: pid} = state),
    do: {:noreply, %{state | monitor: nil, process: nil, credentials: nil}}

  def handle_info(_, state), do: {:noreply, state}

  defp maybe_stop(pid) when is_pid(pid), do: Process.exit(pid, :kill)
  defp maybe_stop(_), do: :ok
end
