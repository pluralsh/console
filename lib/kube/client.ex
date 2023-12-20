defmodule Kube.Client do
  use Kube.Client.Base
  alias Kube
  alias Kazan.Models.Apimachinery.Meta.V1.{ObjectMeta}

  list_request :list_dashboards, Kube.Dashboard.List
  list_request :list_log_filters, Kube.LogFilter.List
  list_request :list_configuration_overlays, Kube.ConfigurationOverlay.List
  list_request :list_runbooks, Kube.Runbook.List
  list_request :list_vertical_pod_autoscalers, Kube.VerticalPodAutoscaler.List
  list_request :list_wireguard_peers, Kube.WireguardPeer.List
  list_request :list_certificate, Kube.Certificate.List
  list_request :list_postgresqls, Kube.Postgresql.List
  list_request :list_clusters, Kube.Cluster.List
  list_request :list_canaries, Kube.Canary.List

  get_request :get_dashboard, Kube.Dashboard
  get_request :get_slashcommand, Kube.SlashCommand
  get_request :get_application, Kube.Application
  get_request :get_certificate, Kube.Certificate
  get_request :get_runbook, Kube.Runbook
  get_request :get_postgresql, Kube.Postgresql
  get_request :get_statefulset_resize, Kube.StatefulSetResize
  get_request :get_vertical_pod_autoscaler, Kube.VerticalPodAutoscaler
  get_request :get_wireguard_peer, Kube.WireguardPeer
  get_request :get_wireguard_server, Kube.WireguardServer
  get_request :get_cluster, Kube.Cluster
  get_request :get_helm_repository, Kube.HelmRepository
  get_request :get_helm_chart, Kube.HelmChart
  get_request :get_canary, Kube.Canary
  get_request :get_plan, Kube.UpgradePlan

  delete_request :delete_wireguard_peer, Kube.WireguardPeer
  delete_request :delete_certificate, Kube.Certificate
  delete_request :delete_postgresql, Kube.Postgresql

  create_request :create_postgresql, Kube.Postgresql
  create_request :create_vertical_pod_autoscaler, Kube.VerticalPodAutoscaler
  create_request :create_statefulset_resize, Kube.StatefulSetResize
  create_request :create_helm_chart, Kube.HelmChart

  list_all_request :list_postgresqls, Kube.Postgresql.List
  list_all_request :list_slashcommands, Kube.SlashCommand.List
  list_all_request :list_licenses, Kube.License.List
  list_all_request :list_applications, Kube.Application.List
  list_all_request :list_metrics, Kube.NodeMetric.List
  list_all_request :list_helm_repositories, Kube.HelmRepository.List

  def raw(path) do
    %Kazan.Request{
      method: "get",
      path: path,
      query_params: %{},
      response_model: Kube.Client.EchoModel
    }
    |> Kube.Utils.run()
  end

  def get_application(name), do: get_application(name, name)

  def get_metrics(node) do
    make_request("/apis/metrics.k8s.io/v1beta1/nodes/#{node}", "get", Kube.NodeMetric)
  end

  def list_peers_for_user(email) do
    Console.namespace("wireguard")
    |> list_wireguard_peers()
    |> case do
      {:ok, %{items: items} = peers} -> {:ok, %{peers | items: Enum.filter(items, &has_email?(&1, email))}}
      error -> error
    end
  end

  defp has_email?(%Kube.WireguardPeer{metadata: %{annotations: %{"vpn.plural.sh/email" => e}}}, e), do: true
  defp has_email?(_, _), do: false

  def delete_wireguard_peer(name), do: delete_wireguard_peer(Console.namespace("wireguard"), name)

  def create_wireguard_peer(email, name) do
    namespace = Console.namespace("wireguard")
    {g, v, k} = Kube.WireguardPeer.gvk()
    peer = %Kube.WireguardPeer{
      metadata: %ObjectMeta{name: name, namespace: namespace, annotations: %{"vpn.plural.sh/email" => email}},
      spec: %Kube.WireguardPeer.Spec{
        wireguard_ref: "wireguard"
      }
    }
    {:ok, encoded} = Kube.WireguardPeer.encode(peer)

    path_builder(g, v, k, namespace)
    |> make_request("post", Kube.WireguardPeer, Jason.encode!(encoded))
  end
end
