defmodule Console.Watchers.Pod do
  use Console.Watchers.Base
  alias Kazan.Apis.Core.V1, as: CoreV1

  def handle_info(:start, state) do
    Logger.info "starting pod watcher"
    request = %Kazan.Request{
      method: "get",
      path: "/api/v1/pods",
      query_params: %{},
      response_model: CoreV1.Pod
    }
    {:ok, pid} = Watcher.start_link(request, send_to: self(), recv_timeout: 15_000)

    :timer.send_interval(5000, :watcher_ping)
    Process.link(pid)
    {:noreply, %{state | pid: pid}}
  end

  def handle_info(:watcher_ping, %{pid: pid} = state) do
    Logger.info "pods k8s watcher alive at pid=#{inspect(pid)}"
    {:noreply, state}
  end

  def handle_info(%Watcher.Event{object: %CoreV1.Pod{} = pod, type: type}, state) do
    publish(pod, type)
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}
end
