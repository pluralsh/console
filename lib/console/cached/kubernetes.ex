defmodule Console.Cached.Kubernetes do
  use GenServer
  alias Kazan.Watcher
  require Logger
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1

  defmodule State, do: defstruct [:instances, :pid]

  def start_link(name, request) do
    GenServer.start_link(__MODULE__, request, name: name)
  end

  def init(request) do
    if Console.conf(:initialize) do
      send self(), {:start, request}
    end
    {:ok, %State{}}
  end

  def fetch(pid \\ __MODULE__), do: GenServer.call(pid, :fetch)

  def handle_call(:fetch, _, %State{instances: instances} = state), do: {:reply, Map.values(instances), state}

  def handle_info({:start, request}, state) do
    Logger.info "starting namespace watcher"
    {:ok, %{items: instances, metadata: %MetaV1.ListMeta{resource_version: vsn}}} = Kazan.run(request)
    {:ok, pid} = Watcher.start_link(request, send_to: self(), resource_vsn: vsn)

    :timer.send_interval(5000, :watcher_ping)
    Process.link(pid)
    {:noreply, %{state | pid: pid,  instances: as_map(instances)}}
  end

  def handle_info(:watcher_ping, %{pid: pid} = state) do
    Logger.info "namespace k8s watcher alive at pid=#{inspect(pid)}"
    {:noreply, state}
  end

  def handle_info(%Watcher.Event{object: o, type: event}, %{instances: instances} = state) when event in [:added, :modified] do
    {:noreply, %{state | instances: Map.put(instances, o.metadata.name, o)}}
  end

  def handle_info(%Watcher.Event{object: o, type: :deleted}, %{instances: instances} = state) do
    {:noreply, %{state | instances: Map.delete(instances, o.metadata.name)}}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp as_map(instances), do: Enum.into(instances, %{}, & {&1.metadata.name, &1})
end
