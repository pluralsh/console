defmodule Console.Deployments.Observability.MetricsTest do
  use ExUnit.Case, async: true
  alias Console.Deployments.Observability.Metrics

  describe "request/limit queries" do
    test "they dedupe kube-state-metrics series per container before summing" do
      for scope <- [:cluster, :component, :service],
          {key, query} <- Metrics.queries(scope),
          String.contains?(query, "kube_pod_container_resource_") do
        assert query =~ "max by (namespace, pod, container) (kube_pod_container_resource_",
               "#{scope}.#{key} doesn't dedupe: #{query}"
        assert query =~ ~s|container!=""|
      end
    end

    test "per-pod queries aggregate by pod after deduping" do
      service = Map.new(Metrics.queries(:service))

      assert service[:pod_cpu_requests] ==
        ~s|sum by (pod) (max by (namespace, pod, container) (kube_pod_container_resource_requests{unit="core",container!="",cluster="$cluster",namespace="$namespace"}))|

      assert service[:mem_limits] ==
        ~s|sum(max by (namespace, pod, container) (kube_pod_container_resource_limits{unit="byte",container!="",cluster="$cluster",namespace="$namespace"}))|
    end
  end
end
