defmodule Console.Cached.Kubernetes do
  use GenServer
  alias Kazan.Watcher
  alias ETS.KeyValueSet
  require Logger

  defmodule State, do: defstruct [:table, :model, :pid, :callback, :key]

  def start_link(name, request, model, callback \\ nil, key \\ & &1.metadata.name) do
    GenServer.start_link(__MODULE__, {request, name, model, callback, key}, name: name)
  end

  def start(name, request, model, callback \\ nil, key \\ & &1.metadata.name) do
    GenServer.start(__MODULE__, {request, name, model, callback, key}, name: name)
  end

  def init({request, name, model, callback, key}) do
    if Console.conf(:initialize) do
      send self(), {:start, request}
    end
    {:ok, table} = KeyValueSet.new(name: name, read_concurrency: true, ordered: true)
    {:ok, %State{table: table, model: model, callback: callback, key: key}}
  end

  def fetch(name) do
    KeyValueSet.wrap_existing!(name)
    |> KeyValueSet.to_list!()
    |> Enum.map(fn {_, v} -> v end)
  end

  def get(name, key) do
    case KeyValueSet.wrap_existing(name) do
      {:ok, set} -> set[key]
      _ -> nil
    end
  end

  def handle_info({:start, request}, %State{table: table, model: model, key: key} = state) do
    Logger.info "starting #{model} watcher"
    with {:ok, %{items: instances, metadata: %{resource_version: vsn}}} <- Kazan.run(request),
         {:ok, pid} <- Watcher.start_link(%{request | response_model: model}, send_to: self(), resource_vsn: vsn) do
      :timer.send_interval(5000, :watcher_ping)
      Process.link(pid)
      table = Enum.reduce(instances, table, &KeyValueSet.put!(&2, key.(&1), &1))
      {:noreply, %{state | pid: pid, table: table}}
    else
      err ->
        Logger.warn "failed to start #{model} watcher for cache: #{inspect(err)}"
        Process.send_after(self(), {:start, request}, :timer.seconds(120))
        {:noreply, state}
    end
  end

  def handle_info(:watcher_ping, %{pid: pid, model: model} = state) do
    Logger.info "#{model} k8s watcher alive at pid=#{inspect(pid)}"
    {:noreply, state}
  end

  def handle_info(%Watcher.Event{object: o, type: event} = e, %{table: table, key: key} = state) when event in [:added, :modified] do
    callback(e, state)
    {:noreply, %{state | table: KeyValueSet.put!(table, key.(o), o)}}
  end

  def handle_info(%Watcher.Event{object: o, type: :deleted} = e, %{table: table, key: key} = state) do
    callback(e, state)
    {:noreply, %{state | table: KeyValueSet.delete!(table, key.(o))}}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp callback(event, %State{callback: back}) when is_function(back), do: back.(event)
  defp callback(_, _), do: :ok
end
