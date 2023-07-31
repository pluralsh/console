defmodule Kube.Client do
  use Kube.Client.Base
  alias Kube
  alias Kazan.Models.Apimachinery.Meta.V1.{ObjectMeta}

  list_request :list_dashboards, Kube.Dashboard.List, "platform.plural.sh", "v1alpha1", "dashboards"
  list_request :list_log_filters, Kube.LogFilter.List, "platform.plural.sh", "v1alpha1", "logfilters"
  list_request :list_configuration_overlays, Kube.ConfigurationOverlay.List, "platform.plural.sh", "v1alpha1", "configurationoverlays"
  list_request :list_runbooks, Kube.RunbookList, "platform.plural.sh", "v1alpha1", "runbooks"
  list_request :list_vertical_pod_autoscalers, Kube.VerticalPodAutoscalerList, "autoscaling.k8s.io", "v1", "verticalpodautoscalers"
  list_request :list_wireguard_peers, Kube.WireguardPeerList, "vpn.plural.sh", "v1alpha1", "wireguardpeers"
  list_request :list_certificate, Kube.Certificate.List, "cert-manager.io", "v1", "certificates"
  list_request :list_postgresqls, Kube.Postgresql.List, "acid.zalan.do", "v1", "postgresqls"

  get_request :get_dashboard, Kube.Dashboard, "platform.plural.sh", "v1alpha1", "dashboards"
  get_request :get_slashcommand, Kube.SlashCommand, "platform.plural.sh", "v1alpha1", "slashcommands"
  get_request :get_application, Kube.Application, "app.k8s.io", "v1beta1", "applications"
  get_request :get_certificate, Kube.Certificate, "cert-manager.io", "v1", "certificates"
  get_request :get_runbook, Kube.Runbook, "platform.plural.sh", "v1alpha1", "runbooks"
  get_request :get_postgresql, Kube.Postgresql, "acid.zalan.do", "v1", "postgresqls"
  get_request :get_statefulset_resize, Kube.StatefulSetResize, "platform.plural.sh", "v1alpha1", "statefulsetresizes"
  get_request :get_vertical_pod_autoscaler, Kube.VerticalPodAutoscaler, "autoscaling.k8s.io", "v1", "verticalpodautoscalers"
  get_request :get_wireguard_peer, Kube.WireguardPeer, "vpn.plural.sh", "v1alpha1", "wireguardpeers"
  get_request :get_wireguard_server, Kube.WireguardServer, "vpn.plural.sh", "v1alpha1", "wireguardservers"

  delete_request :delete_wireguard_peer, "vpn.plural.sh", "v1alpha1", "wireguardpeers"
  delete_request :delete_certificate, "cert-manager.io", "v1", "certificates"
  delete_request :delete_postgresql, "acid.zalan.do", "v1", "postgresqls"

  create_request :create_postgresql, Kube.Postgresql, "acid.zalan.do", "v1", "postgresqls"

  def get_application(name), do: get_application(name, name)

  def list_postgresqls() do
    make_request("/apis/acid.zalan.do/v1/postgresqls", "get", Kube.Postgresql.List)
  end

  def list_slashcommands() do
    make_request("/apis/platform.plural.sh/v1alpha1/slashcommands", "get", Kube.SlashCommand.List)
  end

  def list_licenses() do
    make_request("/apis/platform.plural.sh/v1alpha1/licenses", "get", Kube.License.List)
  end

  def list_applications() do
    make_request("/apis/app.k8s.io/v1beta1/applications", "get", Kube.Application.List)
  end

  def list_metrics() do
    make_request("/apis/metrics.k8s.io/v1beta1/nodes", "get", Kube.NodeMetricList)
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
    peer = %Kube.WireguardPeer{
      metadata: %ObjectMeta{name: name, namespace: namespace, annotations: %{"vpn.plural.sh/email" => email}},
      spec: %Kube.WireguardPeer.Spec{
        wireguard_ref: "wireguard"
      }
    }
    {:ok, encoded} = Kube.WireguardPeer.encode(peer)

    path_builder("vpn.plural.sh", "v1alpha1", "wireguardpeers", namespace, name)
    |> make_request("post", Kube.WireguardPeer, Jason.encode!(encoded))
  end

  def get_metrics(node) do
    make_request("/apis/metrics.k8s.io/v1beta1/nodes/#{node}", "get", Kube.NodeMetric)
  end

  def create_statefulset_resize(namespace, name, %Kube.StatefulSetResize{} = resize) do
    resize = %{resize | metadata: %ObjectMeta{name: name, namespace: namespace}}
    {:ok, encoded} = Kube.StatefulSetResize.encode(resize)

    path_builder("platform.plural.sh", "v1alpha1", "statefulsetresizes", namespace, name)
    |> make_request("post", Kube.StatefulSetResize, Jason.encode!(encoded))
  end

  def create_vertical_pod_autoscaler(namespace, name, %Kube.VerticalPodAutoscaler{} = vpa) do
    resize = %{vpa | metadata: %ObjectMeta{name: name, namespace: namespace}}
    {:ok, encoded} = Kube.VerticalPodAutoscaler.encode(resize)

    path_builder("autoscaling.k8s.io", "v1", "verticalpodautoscalers", namespace, name)
    |> make_request("post", Kube.VerticalPodAutoscaler, Jason.encode!(encoded))
  end
end
