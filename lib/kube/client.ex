defmodule Kube.Client do
  alias Kube
  alias Kazan.Models.Apimachinery.Meta.V1.{ObjectMeta}

  def list_dashboards(ns) do
    %Kazan.Request{
      method: "get",
      path: "/apis/platform.plural.sh/v1alpha1/namespaces/#{Console.namespace(ns)}/dashboards",
      query_params: %{},
      response_model: Kube.DashboardList
    }
    |> Kazan.run()
  end

  def list_log_filters(ns) do
    %Kazan.Request{
      method: "get",
      path: "/apis/platform.plural.sh/v1alpha1/namespaces/#{Console.namespace(ns)}/logfilters",
      query_params: %{},
      response_model: Kube.LogFilterList
    }
    |> Kazan.run()
  end

  def list_configuration_overlays(ns) do
    %Kazan.Request{
      method: "get",
      path: "/apis/platform.plural.sh/v1alpha1/namespaces/#{Console.namespace(ns)}/configurationoverlays",
      query_params: %{},
      response_model: Kube.ConfigurationOverlayList
    }
    |> Kazan.run()
  end

  def get_dashboard(ns, name) do
    %Kazan.Request{
      method: "get",
      path: "/apis/platform.plural.sh/v1alpha1/namespaces/#{Console.namespace(ns)}/dashboards/#{name}",
      query_params: %{},
      response_model: Kube.Dashboard
    }
    |> Kazan.run()
  end

  def get_slashcommand(ns, name) do
    %Kazan.Request{
      method: "get",
      path: "/apis/platform.plural.sh/v1alpha1/namespaces/#{Console.namespace(ns)}/slashcommands/#{name}",
      query_params: %{},
      response_model: Kube.SlashCommand
    }
    |> Kazan.run()
  end

  def list_slashcommands() do
    %Kazan.Request{
      method: "get",
      path: "/apis/platform.plural.sh/v1alpha1/slashcommands",
      query_params: %{},
      response_model: Kube.SlashCommandList
    }
    |> Kazan.run()
  end

  def list_licenses() do
    %Kazan.Request{
      method: "get",
      path: "/apis/platform.plural.sh/v1alpha1/licenses",
      query_params: %{},
      response_model: Kube.LicenseList
    }
    |> Kazan.run()
  end

  def get_application(name) do
    %Kazan.Request{
      method: "get",
      path: "/apis/app.k8s.io/v1beta1/namespaces/#{Console.namespace(name)}/applications/#{name}",
      query_params: %{},
      response_model: Kube.Application
    }
    |> Kazan.run()
  end

  def get_certificate(ns, name) do
    %Kazan.Request{
      method: "get",
      path: "/apis/cert-manager.io/v1/namespaces/#{ns}/certificates/#{name}",
      query_params: %{},
      response_model: Kube.Certificate
    }
    |> Kazan.run()
  end

  def list_applications() do
    %Kazan.Request{
      method: "get",
      path: "/apis/app.k8s.io/v1beta1/applications",
      query_params: %{},
      response_model: Kube.ApplicationList
    }
    |> Kazan.run()
  end

  def list_metrics() do
    %Kazan.Request{
      method: "get",
      path: "/apis/metrics.k8s.io/v1beta1/nodes",
      query_params: %{},
      response_model: Kube.NodeMetricList
    }
    |> Kazan.run()
  end

  def get_metrics(node) do
    %Kazan.Request{
      method: "get",
      path: "/apis/metrics.k8s.io/v1beta1/nodes/#{node}",
      query_params: %{},
      response_model: Kube.NodeMetric
    }
    |> Kazan.run()
  end

  def list_runbooks(ns, params \\ %{}) do
    %Kazan.Request{
      method: "get",
      path: "/apis/platform.plural.sh/v1alpha1/namespaces/#{Console.namespace(ns)}/runbooks",
      query_params: params,
      response_model: Kube.RunbookList
    }
    |> Kazan.run()
  end

  def get_runbook(ns, name) do
    %Kazan.Request{
      method: "get",
      path: "/apis/platform.plural.sh/v1alpha1/namespaces/#{Console.namespace(ns)}/runbooks/#{name}",
      query_params: %{},
      response_model: Kube.Runbook
    }
    |> Kazan.run()
  end

  def create_statefulset_resize(namespace, name, %Kube.StatefulSetResize{} = resize) do
    resize = %{resize | metadata: %ObjectMeta{name: name, namespace: namespace}}
    {:ok, encoded} = Kube.StatefulSetResize.encode(resize)

    %Kazan.Request{
      method: "post",
      path: "/apis/platform.plural.sh/v1alpha1/namespaces/#{namespace}/statefulsetresizes/#{name}",
      query_params: %{},
      body: Jason.encode!(encoded),
      content_type: "application/json",
      response_model: Kube.StatefulSetResize
    }
    |> Kazan.run()
  end

  def get_statefulset_resize(namespace, name) do
    %Kazan.Request{
      method: "get",
      path: "/apis/platform.plural.sh/v1alpha1/namespaces/#{namespace}/statefulsetresizes/#{name}",
      query_params: %{},
      response_model: Kube.StatefulSetResize
    }
    |> Kazan.run()
  end

  def get_vertical_pod_autoscaler(namespace, name) do
    %Kazan.Request{
      method: "get",
      path: "/apis/autoscaling.k8s.io/v1/namespaces/#{Console.namespace(namespace)}/verticalpodautoscalers/#{name}",
      query_params: %{},
      response_model: Kube.VerticalPodAutoscaler
    }
    |> Kazan.run()
  end

  def list_vertical_pod_autoscalers(namespace) do
    %Kazan.Request{
      method: "get",
      path: "/apis/autoscaling.k8s.io/v1/namespaces/#{Console.namespace(namespace)}/verticalpodautoscalers",
      query_params: %{},
      response_model: Kube.VerticalPodAutoscaler
    }
    |> Kazan.run()
  end

  def create_vertical_pod_autoscaler(namespace, name, %Kube.VerticalPodAutoscaler{} = vpa) do
    resize = %{vpa | metadata: %ObjectMeta{name: name, namespace: namespace}}
    {:ok, encoded} = Kube.VerticalPodAutoscaler.encode(resize)

    %Kazan.Request{
      method: "post",
      path: "/apis/autoscaling.k8s.io/v1/namespaces/#{namespace}/verticalpodautoscalers/#{name}",
      query_params: %{},
      body: Jason.encode!(encoded),
      content_type: "application/json",
      response_model: Kube.VerticalPodAutoscaler
    }
    |> Kazan.run()
  end
end
