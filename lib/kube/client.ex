defmodule Kube.Client do
  use Kube.Client.Base
  alias Kube
  alias Kazan.Models.Apimachinery.Meta.V1.{ObjectMeta}

  list_request :list_dashboards, Kube.DashboardList, "platform.plural.sh", "v1alpha1", "dashboards"
  list_request :list_log_filters, Kube.LogFilterList, "platform.plural.sh", "v1alpha1", "logfilters"
  list_request :list_configuration_overlays, Kube.ConfigurationOverlayList, "platform.plural.sh", "v1alpha1", "configurationoverlays"
  list_request :list_runbooks, Kube.RunbookList, "platform.plural.sh", "v1alpha1", "runbooks"
  list_request :list_vertical_pod_autoscalers, Kube.VerticalPodAutoscalerList, "autoscaling.k8s.io", "v1", "verticalpodautoscalers"

  get_request :get_dashboard, Kube.Dashboard, "platform.plural.sh", "v1alpha1", "dashboards"
  get_request :get_slashcommand, Kube.SlashCommand, "platform.plural.sh", "v1alpha1", "slashcommands"
  get_request :get_application, Kube.Application, "app.k8s.io", "v1", "applications"
  get_request :get_certificate, Kube.Certificate, "cert-manager.io", "v1", "certificates"
  get_request :get_runbook, Kube.Runbook, "platform.plural.sh", "v1alpha1", "runbooks"
  get_request :get_statefulset_resize, Kube.StatefulSetResize, "platform.plural.sh", "v1alpha1", "statefulsetresizes"
  get_request :get_vertical_pod_autoscaler, Kube.VerticalPodAutoscaler, "autoscaling.k8s.io", "v1", "verticalpodautoscalers"

  def get_application(name), do: get_application(name, name)

  def list_slashcommands() do
    make_request("/apis/platform.plural.sh/v1alpha1/slashcommands", "get", Kube.SlashCommandList)
  end

  def list_licenses() do
    make_request("/apis/platform.plural.sh/v1alpha1/licenses", "get", Kube.LicenseList)
  end

  def list_applications() do
    make_request("/apis/app.k8s.io/v1/applications", "get", Kube.ApplicationList)
  end

  def list_metrics() do
    make_request("/apis/metrics.k8s.io/v1beta1/nodes", "get", Kube.NodeMetricList)
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
