defmodule Watchman.Watchers.Application do
  use Watchman.Watchers.Base

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

  def handle_info(%Watcher.Event{object: app, type: type}, state) do
    publish(app, type)
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}
end
