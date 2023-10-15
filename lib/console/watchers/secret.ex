defmodule Console.Watchers.Secret do
  use Console.Watchers.Base
  alias Console.Deployments.Clusters
  alias Kazan.Apis.Core.V1, as: CoreV1

  @cluster_label "cluster.x-k8s.io/cluster-name"

  def handle_info(:start, state) do
    Logger.info "starting secret watcher"
    request = %Kazan.Request{
      method: "get",
      path: "/api/v1/secrets",
      query_params: %{"labelSelector" => @cluster_label},
      response_model: CoreV1.Secret
    }
    {:ok, pid} = Watcher.start_link(request, send_to: self(), recv_timeout: 15_000)

    :timer.send_interval(5000, :watcher_ping)
    Process.link(pid)
    {:noreply, %{state | pid: pid}}
  end

  def handle_info(:watcher_ping, %{pid: pid} = state) do
    Logger.info "secrets k8s watcher alive at pid=#{inspect(pid)}"
    {:noreply, state}
  end

  def handle_info(%Watcher.Event{object: %CoreV1.Secret{metadata: %{namespace: ns, name: name, labels: %{@cluster_label => name}}}}, state) do
    Logger.info "secret event for #{ns}/#{name}, attempting to refresh cluster kubeconfigs"
    Clusters.refresh_kubeconfig(ns, name)
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}
end
