require Kube.Parser

# external crds
Kube.Parser.parse(path: "crds/postgresql.yaml", module: Kube.Postgresql)
Kube.Parser.parse(path: "crds/cert-manager.yaml", module: Kube.Certificate)
Kube.Parser.parse(path: "crds/application.yaml", module: Kube.Application)
Kube.Parser.parse(path: "crds/clusters.cluster.x-k8s.io.yaml", module: Kube.Cluster)

# plural crds
Kube.Parser.parse(path: "crds/license.yaml", module: Kube.License)
Kube.Parser.parse(path: "crds/config-overlay.yaml", module: Kube.ConfigurationOverlay)
Kube.Parser.parse(path: "crds/logfilter.yaml", module: Kube.LogFilter)
Kube.Parser.parse(path: "crds/slashcommand.yaml", module: Kube.SlashCommand)
Kube.Parser.parse(path: "crds/ss-resize.yaml", module: Kube.StatefulSetResize)
Kube.Parser.parse(path: "crds/dashboard.yaml", module: Kube.Dashboard)
Kube.Parser.parse(path: "crds/runbook.yaml", module: Kube.Runbook)

Kube.Parser.parse(path: "crds/wireguardserver.yaml", module: Kube.WireguardServer)
Kube.Parser.parse(path: "crds/wireguardpeer.yaml", module: Kube.WireguardPeer, ovveride: [
  {"configRef", Kazan.Apis.Core.V1.SecretKeySelector}
])

# overridden crds

Kube.Parser.parse(path: "crds/vpa.yaml", module: Kube.VerticalPodAutoscaler, override: [
  {"targetRef", Kazan.Apis.Autoscaling.V1.CrossVersionObjectReference}
])

## this cannot be read from a CRD as its actually piped through a dedicated API service

defmodule Kube.NodeMetric do
  use Kazan.Model

  defmodule Usage do
    use Kazan.Model

    defmodel "Usage", "metrics.k8s.io", "v1beta1" do
      property :cpu,    "cpu",    :string
      property :memory, "memory", :string
    end
  end

  defmodel "NodeMetric", "metrics.k8s.io", "v1beta1" do
    property :timestamp, "timestamp", :string
    property :window,    "window",    :string
    property :usage,     "usage",     Usage
  end

  def gvk(), do: {"metrics.k8s.io", "v1beta1", "nodes"}
end

defmodule Kube.NodeMetric.List do
  use Kazan.Model

  def item_model(), do: Kube.NodeMetric

  defmodellist "NodeMetricList",
               "metrics.k8s.io",
               "v1beta1",
               Kube.NodeMetric
end
