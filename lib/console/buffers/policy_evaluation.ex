defmodule Console.Buffers.PolicyEvaluation do
  use GenServer
  import Console.Services.Base, only: [timestamped: 1]
  alias Console.Repo
  alias Console.Schema.PolicyEvaluation

  @flush_size 500
  @poll :timer.minutes(5)

  defmodule State, do: defstruct [records: [], count: 0]

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def start(opts \\ []) do
    GenServer.start(__MODULE__, opts)
  end

  def init(_) do
    :timer.send_interval(@poll, :flush)
    Process.flag(:trap_exit, true)
    {:ok, %State{}}
  end

  def submit(pid \\ __MODULE__, attrs), do: GenServer.cast(pid, {:log, attrs})

  def flush(pid \\ __MODULE__), do: GenServer.call(pid, :flush)

  def handle_call(:flush, _, %State{records: records}), do: {:reply, :ok, do_flush(records)}

  def handle_cast({:log, attrs}, state), do: {:noreply, maybe_flush(timestamped(attrs), state)}

  def handle_info(:flush, %State{records: records}), do: {:noreply, do_flush(records)}
  def handle_info(_, state), do: {:noreply, state}

  def terminate(_, %State{records: [_ | _] = records}), do: Repo.insert_all(PolicyEvaluation, records)
  def terminate(_, _), do: :ok

  defp maybe_flush(attrs, %State{records: records, count: count}) when count >= @flush_size - 1,
    do: do_flush([attrs | records])
  defp maybe_flush(attrs, %State{records: records, count: count} = state),
    do: %{state | records: [attrs | records], count: count + 1}

  defp do_flush([_ | _] = records) do
    Repo.insert_all(PolicyEvaluation, records)
    %State{}
  end
  defp do_flush(_), do: %State{}
end
