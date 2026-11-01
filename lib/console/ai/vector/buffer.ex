defmodule Console.AI.Vector.Buffer do
  @moduledoc """
  Accumulates prepared writes for `Console.AI.Vector.Bulk` stores and writes them with the
  store's `bulk_write/2`.  The buffer is idle while empty; the first entry starts a timer, and
  the open batch is sealed once it's waited `max_age`, before it'd exceed the store's limits, or
  before an entry that conflicts with it.

  Sealed batches are written in order.  A batch failing with `{:retry, _}` stays at the head of the
  queue and is retried with backoff while later batches wait behind it; one failing with `{:error, _}`
  is dropped.  At most `@max_pending` sealed batches are kept, dropping the oldest beyond that.
  """
  use GenServer
  require Logger

  @max_age :timer.seconds(10)
  @min_backoff :timer.seconds(5)
  @max_backoff :timer.minutes(2)
  @max_pending 20
  @timeout :timer.seconds(60)

  defmodule Batch do
    defstruct entries: [], count: 0, bytes: 0
  end

  defmodule State do
    alias Console.AI.Vector.Buffer.Batch

    defstruct [:store, :timer, :retry, :backoff, :max_age, :min_backoff, current: %Batch{}, pending: :queue.new()]
  end

  alias Console.AI.Vector.Buffer.Batch

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: Keyword.get(opts, :name, __MODULE__))
  end

  def init(opts) do
    Process.flag(:trap_exit, true)
    {:ok, %State{
      max_age: Keyword.get(opts, :max_age, @max_age),
      min_backoff: Keyword.get(opts, :min_backoff, @min_backoff)
    }, :hibernate}
  end

  @spec push(GenServer.server, struct, term) :: :ok | Console.error
  def push(pid \\ __MODULE__, store, entry), do: GenServer.call(pid, {:push, store, entry}, @timeout)

  @doc "Writes everything buffered, retrying a failed batch immediately"
  @spec flush(GenServer.server) :: :ok | Console.error
  def flush(pid \\ __MODULE__), do: GenServer.call(pid, :flush, @timeout)

  def handle_call({:push, %{__struct__: mod} = store, entry}, _, state) do
    %{max_bytes: max_bytes, max_count: max_count} = mod.limits(store)

    case mod.size(entry) do
      size when size > max_bytes ->
        reply(state, {:error, "vector write of #{size} bytes exceeds the #{max_bytes} byte limit of #{inspect(mod)}"})
      size ->
        state
        |> switch_store(store)
        |> seal_if(&(&1.count > 0 && (&1.bytes + size > max_bytes || mod.conflicts?(store, &1.entries, entry))))
        |> add(entry, size)
        |> seal_if(&(&1.count >= max_count || &1.bytes >= max_bytes))
        |> drain()
        |> reply(:ok)
    end
  end

  def handle_call(:flush, _, state) do
    state = state |> seal() |> force_drain()
    case :queue.len(state.pending) do
      0 -> reply(state, :ok)
      n -> reply(state, {:error, "#{n} vector write batches are pending retry"})
    end
  end

  def handle_info({:seal, ref}, %State{timer: {ref, _}} = state),
    do: noreply(state |> seal() |> drain())
  def handle_info({:retry, ref}, %State{retry: {ref, _}} = state),
    do: noreply(drain(%{state | retry: nil}))
  def handle_info(_, state), do: {:noreply, state}

  def terminate(_, state), do: state |> seal() |> force_drain()

  defp switch_store(%State{store: nil} = state, store), do: %{state | store: store}
  defp switch_store(%State{store: store} = state, store), do: state
  defp switch_store(state, store) do
    state = state |> seal() |> force_drain()
    if :queue.len(state.pending) > 0,
      do: Logger.error("dropping #{:queue.len(state.pending)} vector write batches after the vector store changed")
    cancel(state.retry)
    %{state | store: store, pending: :queue.new(), retry: nil, backoff: nil}
  end

  defp add(%State{current: %Batch{entries: entries, count: count, bytes: bytes}} = state, entry, size) do
    %{state | current: %Batch{entries: [entry | entries], count: count + 1, bytes: bytes + size}}
    |> schedule()
  end

  defp schedule(%State{timer: nil, max_age: age} = state) do
    ref = make_ref()
    %{state | timer: {ref, Process.send_after(self(), {:seal, ref}, age)}}
  end
  defp schedule(state), do: state

  defp seal_if(%State{current: batch} = state, pred) do
    case pred.(batch) do
      true -> seal(state)
      _ -> state
    end
  end

  defp seal(%State{current: %Batch{count: 0}} = state), do: state
  defp seal(%State{current: batch, pending: pending, timer: timer} = state) do
    cancel(timer)
    %{state | current: %Batch{}, timer: nil, pending: cap(:queue.in(batch, pending))}
  end

  defp cap(pending) do
    case :queue.len(pending) > @max_pending do
      true ->
        {{:value, %Batch{count: count}}, rest} = :queue.out(pending)
        Logger.error("dropping #{count} buffered vector writes, too many batches are pending retry")
        rest
      false -> pending
    end
  end

  defp force_drain(%State{retry: retry} = state) do
    cancel(retry)
    drain(%{state | retry: nil})
  end

  defp drain(%State{retry: nil, store: %{__struct__: mod} = store, pending: pending} = state) do
    case :queue.out(pending) do
      {:empty, _} -> %{state | backoff: nil}
      {{:value, %Batch{entries: entries, count: count}}, rest} ->
        case mod.bulk_write(store, Enum.reverse(entries)) do
          :ok -> drain(%{state | pending: rest, backoff: nil})
          {:retry, err} ->
            Logger.warning("retrying #{count} vector writes to #{inspect(mod)}: #{inspect(err)}")
            schedule_retry(state)
          {:error, err} ->
            Logger.error("dropping #{count} vector writes to #{inspect(mod)}: #{inspect(err)}")
            drain(%{state | pending: rest})
        end
    end
  end
  defp drain(state), do: state

  defp schedule_retry(%State{backoff: backoff, min_backoff: min} = state) do
    backoff = if backoff, do: min(backoff * 2, @max_backoff), else: min
    ref = make_ref()
    %{state | backoff: backoff, retry: {ref, Process.send_after(self(), {:retry, ref}, backoff)}}
  end

  defp cancel({_, timer}), do: Process.cancel_timer(timer)
  defp cancel(_), do: :ok

  defp idle?(%State{current: %Batch{count: 0}, pending: pending}), do: :queue.is_empty(pending)
  defp idle?(_), do: false

  defp reply(state, result) do
    if idle?(state), do: {:reply, result, state, :hibernate}, else: {:reply, result, state}
  end

  defp noreply(state) do
    if idle?(state), do: {:noreply, state, :hibernate}, else: {:noreply, state}
  end
end
