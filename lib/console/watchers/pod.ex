defmodule Console.Watchers.Pod do
  use Console.Watchers.Base

  def handle_info(:start, state) do
    Logger.info "starting pod watcher"
    request = Kazan.Apis.Core.V1.list_pod_for_all_namespaces(watch: true)
    {:ok, pid} = Watcher.start_link(request, send_to: self())

    :timer.send_interval(5000, :watcher_ping)
    Process.link(pid)
    {:noreply, %{state | pid: pid}}
  end

  def handle_info(:watcher_ping, %{pid: pid} = state) do
    Logger.info "pods k8s watcher alive at pid=#{inspect(pid)}"
    {:noreply, state}
  end

  def handle_info(%Watcher.Event{object: app, type: type}, state) do
    publish(app, type)
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}
end
