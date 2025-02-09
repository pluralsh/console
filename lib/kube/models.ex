require Kube.Parser

# external crds
Kube.Parser.parse(path: "static/crds/postgresql.yaml", module: Kube.Postgresql)
Kube.Parser.parse(path: "static/crds/cert-manager.yaml", module: Kube.Certificate)
Kube.Parser.parse(path: "static/crds/certificate-request.yaml", module: Kube.CertificateRequest)
Kube.Parser.parse(path: "static/crds/application.yaml", module: Kube.Application)
Kube.Parser.parse(path: "static/crds/clusters.cluster.x-k8s.io.yaml", module: Kube.Cluster)
Kube.Parser.parse(path: "static/crds/helmrepository.yaml", module: Kube.HelmRepository)
Kube.Parser.parse(path: "static/crds/helmchart.yaml", module: Kube.HelmChart)
Kube.Parser.parse(path: "static/crds/flagger-canary.yaml", module: Kube.Canary)
Kube.Parser.parse(path: "static/crds/upgrade-plan.yaml", module: Kube.UpgradePlan)
Kube.Parser.parse(path: "static/crds/rollout.yaml", module: Kube.Rollout)

# plural crds
Kube.Parser.parse(path: "static/crds/license.yaml", module: Kube.License)
Kube.Parser.parse(path: "static/crds/config-overlay.yaml", module: Kube.ConfigurationOverlay)
Kube.Parser.parse(path: "static/crds/logfilter.yaml", module: Kube.LogFilter)
Kube.Parser.parse(path: "static/crds/slashcommand.yaml", module: Kube.SlashCommand)
Kube.Parser.parse(path: "static/crds/ss-resize.yaml", module: Kube.StatefulSetResize)
Kube.Parser.parse(path: "static/crds/dashboard.yaml", module: Kube.Dashboard)
Kube.Parser.parse(path: "static/crds/runbook.yaml", module: Kube.Runbook)
Kube.Parser.parse(path: "static/crds/metricsaggregate.yaml", module: Kube.MetricsAggregate)

# plural cd crds
Kube.Parser.parse(path: "charts/controller/crds/deployments.plural.sh_clusters.yaml", module: Kube.PluralCluster)
Kube.Parser.parse(path: "charts/controller/crds/deployments.plural.sh_gitrepositories.yaml", module: Kube.GitRepository)
Kube.Parser.parse(path: "charts/controller/crds/deployments.plural.sh_servicedeployments.yaml", module: Kube.ServiceDeployment)

Kube.Parser.parse(path: "static/crds/wireguardserver.yaml", module: Kube.WireguardServer)
Kube.Parser.parse(path: "static/crds/wireguardpeer.yaml", module: Kube.WireguardPeer, ovveride: [
  # {"configRef", Kazan.Apis.Core.V1.SecretKeySelector}
])

# overridden crds

Kube.Parser.parse(path: "static/crds/vpa.yaml", module: Kube.VerticalPodAutoscaler, override: [
  # {"targetRef", Kazan.Apis.Autoscaling.V1.CrossVersionObjectReference}
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
