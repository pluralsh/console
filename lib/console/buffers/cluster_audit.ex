defmodule Console.Buffers.ClusterAudit do
  use GenServer
  import Console.Services.Base, only: [timestamped: 1]
  alias Console.Repo
  alias Console.Schema.ClusterAuditLog

  @flush_size 500
  @poll :timer.minutes(30)

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

  def audit(pid \\ __MODULE__, attrs), do: GenServer.cast(pid, {:log, attrs})

  def flush(pid \\ __MODULE__), do: GenServer.call(pid, :flush)

  def handle_call(:flush, _, %State{records: records}), do: {:reply, :ok, do_flush(records)}

  def handle_cast({:log, attrs}, state), do: {:noreply, maybe_flush(timestamped(attrs), state)}

  def handle_info(:flush, %State{records: records}), do: {:noreply, do_flush(records)}
  def handle_info(_, state), do: {:noreply, state}

  defp maybe_flush(attrs, %State{records: records, count: count}) when count >= @flush_size - 1,
    do: do_flush([attrs | records])
  defp maybe_flush(attrs, %State{records: records} = state), do: put_in(state.records, [attrs | records])

  def terminate(_, %State{records: [_ | _] = records}), do: Repo.insert_all(ClusterAuditLog, records)
  def terminate(_, _), do: :ok

  defp do_flush([_ | _] = records) do
    Repo.insert_all(ClusterAuditLog, records)
    %State{}
  end
  defp do_flush(_), do: %State{}
end
