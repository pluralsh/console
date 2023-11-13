defmodule Console.Watchers.Application do
  use Console.Watchers.Base

  def handle_info(:start, state) do
    Logger.info "starting application watcher"

    %Kazan.Request{
      method: "get",
      path: "/apis/app.k8s.io/v1beta1/applications",
      query_params: %{},
      response_model: Kube.Application
    }
    |> Watcher.start_link(send_to: self())
    |> case do
      {:ok, pid} ->
        :timer.send_interval(5000, :watcher_ping)
        Process.link(pid)
        {:noreply, %{state | pid: pid}}
      {:error, _} ->
        Logger.info "failed to watch applications (perhaps the crd was not installed)"
        Process.send_after(self(), :start, :timer.minutes(2))
        {:noreply, state}
    end
  end

  def handle_info(:watcher_ping, %{pid: pid} = state) do
    Logger.info "Application k8s watcher alive at pid=#{inspect(pid)}"
    {:noreply, state}
  end

  def handle_info(%Watcher.Event{object: app, type: type}, state) do
    publish(app, type)
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}
end
