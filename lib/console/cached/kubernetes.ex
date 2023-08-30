defmodule Console.Cached.Kubernetes do
  use GenServer
  alias Kazan.Watcher
  alias ETS.KeyValueSet
  require Logger

  defmodule State, do: defstruct [:table, :model, :pid, :callback]

  def start_link(name, request, model, callback \\ nil) do
    GenServer.start_link(__MODULE__, {request, name, model, callback}, name: name)
  end

  def start(name, request, model, callback \\ nil) do
    GenServer.start(__MODULE__, {request, name, model, callback}, name: name)
  end

  def init({request, name, model, callback}) do
    if Console.conf(:initialize) do
      send self(), {:start, request}
    end
    {:ok, table} = KeyValueSet.new(name: name, read_concurrency: true, ordered: true)
    {:ok, %State{table: table, model: model, callback: callback}}
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

  def handle_info({:start, request}, %State{table: table, model: model} = state) do
    Logger.info "starting namespace watcher"
    {:ok, %{items: instances, metadata: %{resource_version: vsn}}} = Kazan.run(request)
    {:ok, pid} = Watcher.start_link(%{request | response_model: model}, send_to: self(), resource_vsn: vsn)

    :timer.send_interval(5000, :watcher_ping)
    Process.link(pid)
    table = Enum.reduce(instances, table, &KeyValueSet.put!(&2, &1.metadata.name, &1))
    {:noreply, %{state | pid: pid, table: table}}
  end

  def handle_info(:watcher_ping, %{pid: pid} = state) do
    Logger.info "namespace k8s watcher alive at pid=#{inspect(pid)}"
    {:noreply, state}
  end

  def handle_info(%Watcher.Event{object: o, type: event} = e, %{table: table} = state) when event in [:added, :modified] do
    callback(e, state)
    {:noreply, %{state | table: KeyValueSet.put!(table, o.metadata.name, o)}}
  end

  def handle_info(%Watcher.Event{object: o, type: :deleted} = e, %{table: table} = state) do
    callback(e, state)
    {:noreply, %{state | table: KeyValueSet.delete!(table, o.metadata.name)}}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp callback(event, %State{callback: back}) when is_function(back), do: back.(event)
  defp callback(_, _), do: :ok
end
