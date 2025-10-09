defmodule Console.Cached.Kubernetes do
  use GenServer
  alias Kazan.Watcher
  require Logger

  defmodule State, do: defstruct [:table, :model, :pid, :callback, :key, :monitor, :request, :timer]

  def start_link(name, request, model, callback \\ nil, key \\ & &1.metadata.name) do
    GenServer.start_link(__MODULE__, {request, name, model, callback, key}, name: name)
  end

  def start(name, request, model, callback \\ nil, key \\ & &1.metadata.name) do
    GenServer.start(__MODULE__, {request, name, model, callback, key}, name: name)
  end

  def init({request, name, model, callback, key}) do
    if Console.conf(:initialize) do
      Logger.info "boostrapping watcher for #{model}"
      send self(), {:start, request}
    end
    table = :ets.new(name, [:ordered_set, :named_table, :protected, read_concurrency: true])
    {:ok, %State{table: table, model: model, callback: callback, key: key}}
  end

  def fetch(name) do
    case exists?(name) do
      true ->
        :ets.tab2list(name)
        |> Enum.map(fn {_, v} -> v end)
      false -> []
    end
  end

  def get(name, key) do
    with true <- exists?(name),
         [{^key, v}] <- :ets.lookup(name, key) do
      v
    else
      _ -> nil
    end
  end

  defp exists?(name) do
    case :ets.whereis(name) do
      :undefined -> false
      _ -> true
    end
  end

  def handle_info(:seppuku, state), do: {:stop, {:shutdown, :restarting}, state}

  def handle_info({:start, request}, %State{table: table, model: model, key: key, pid: old} = state) do
    Logger.info "starting #{model} watcher"

    with _ <- maybe_kill(old),
         {:ok, %{items: instances, metadata: %{resource_version: vsn}}} <- Kazan.run(request),
         {:ok, pid} <- Watcher.start_link(%{request | response_model: model}, send_to: self(), resource_vsn: vsn) do
      Process.send_after(self(), {:start, request}, :timer.minutes(30) + jitter())
      :ets.delete_all_objects(table)
      :ets.insert(table, Enum.map(instances, &{key.(&1), &1}))
      {:noreply, start_timer(%{state | pid: pid, table: table})}
    else
      _err ->
        Logger.warning "did not start #{model} watcher for cache"
        Process.send_after(self(), {:start, request}, :timer.seconds(120))
        {:noreply, stop_timer(state)}
    end
  end

  def handle_info(:watcher_ping, %{pid: pid, model: model} = state) do
    Logger.info "#{model} k8s watcher alive at pid=#{inspect(pid)}"
    {:noreply, state}
  end

  def handle_info(%Watcher.Event{object: o, type: :deleted} = e, %{table: table, key: key} = state) do
    callback(e, state)
    :ets.delete(table, key.(o))
    {:noreply, state}
  end

  def handle_info(%Watcher.Event{object: o, type: event} = e, %{table: table, key: key} = state) do
    Logger.info "found event #{event} for #{state.model}"
    callback(e, state)
    :ets.insert(table, {key.(o), o})
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp start_timer(%State{timer: nil} = state) do
    {:ok, ref} = :timer.send_interval(:timer.seconds(5), :watcher_ping)
    %{state | timer: ref}
  end
  defp start_timer(state), do: state

  defp stop_timer(%State{timer: ref} = state) when not is_nil(ref) do
    :timer.cancel(ref)
    %{state | timer: nil}
  end
  defp stop_timer(state), do: state

  defp callback(event, %State{callback: back}) when is_function(back), do: back.(event)
  defp callback(_, _), do: :ok

  defp maybe_kill(pid) when is_pid(pid) do
    Process.unlink(pid)
    Process.exit(pid, :kill)
  end
  defp maybe_kill(_), do: :ok

  defp jitter(), do: :rand.uniform(:timer.seconds(120)) - :timer.seconds(60)
end
