defmodule Watchman.Watchers.Application do
  use GenServer
  import Watchman.Watchers.Base
  alias Kazan.Watcher
  require Logger

  defmodule State, do: defstruct [:pid]

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts)
  end

  def init(_) do
    send self(), :start
    {:ok, %State{}}
  end

  def handle_call({:swarm, :begin_handoff}, _from, state), do: {:reply, :restart, state}

  def handle_cast({:swarm, :end_handoff, _}, state), do: {:noreply, state}

  def handle_cast({:swarm, :resolve_conflict, _delay}, state),
    do: {:noreply, state}

  def handle_info(:start, state) do
    Logger.info "starting application watcher"
    {:ok, pid} = Watcher.start_link(%Kazan.Request{
      method: "get",
      path: "/apis/app.k8s.io/v1beta1/applications",
      query_params: %{},
      response_model: Kube.Application
    }, send_to: self())

    Process.monitor(pid)
    {:noreply, %{state | pid: pid}}
  end

  def handle_info({:DOWN, _, :process, _, _}, state) do
    send self(), :start
    {:noreply, state}
  end

  def handle_info(%Watcher.Event{object: app, type: type}, state) do
    publish(app, type)
    {:noreply, state}
  end

  def handle_info({:swarm, :die}, state) do
    {:stop, :shutdown, state} # would be good to record last resource version here
  end

  def handle_info(_, state), do: {:noreply, state}
end