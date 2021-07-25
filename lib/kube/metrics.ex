defmodule Kube.NodeMetric do
  use Kazan.Model

  defmodule Usage do
    use Kazan.Model

    defmodel "Usage", "metrics.k8s.io", "v1beta1" do
      property :cpu,    "cpu", :string
      property :memory, "memory", :string
    end
  end

  defmodel "NodeMetric", "metrics.k8s.io", "v1beta1" do
    property :timestamp, "timestamp", :string
    property :window, "window",       :string
    property :usage, "usage",         Usage
  end
end

defmodule Kube.NodeMetricList do
  use Kazan.Model

  defmodellist "NodeMetricList",
               "metrics.k8s.io",
               "v1beta1",
               Kube.NodeMetric
end
