defmodule Console.Deployments.Observability.MetricsTest do
  use ExUnit.Case, async: true
  alias Console.Deployments.Observability.Metrics
  alias Prometheus.Client

  # label_replace's "$1" is a regex capture reference rather than a template variable
  @unsubstituted ~r/\$(\{|[A-Za-z_])/

  describe "request/limit queries" do
    test "they dedupe kube-state-metrics series per container before summing" do
      for scope <- [:cluster, :component, :service, :pod],
          {key, query} <- Metrics.queries(scope),
          String.contains?(query, "kube_pod_container_resource_") do
        assert query =~ "max by (namespace, pod, container) (kube_pod_container_resource_",
               "#{scope}.#{key} doesn't dedupe: #{query}"
        assert query =~ ~s|container!=""|
        assert query =~ ~r/resource="(cpu|memory|ephemeral_storage)"/,
               "#{scope}.#{key} doesn't filter by resource: #{query}"
      end
    end

    test "per-pod queries aggregate by pod after deduping" do
      service = Map.new(Metrics.queries(:service))

      assert service[:pod_cpu_requests] ==
        ~s|sum by (pod) (max by (namespace, pod, container) (kube_pod_container_resource_requests{resource="cpu",unit="core",container!="",cluster="${cluster}",namespace="${namespace}"}))|

      assert service[:mem_limits] ==
        ~s|sum(max by (namespace, pod, container) (kube_pod_container_resource_limits{resource="memory",unit="byte",container!="",cluster="${cluster}",namespace="${namespace}"}))|
    end
  end

  describe "pod queries" do
    test "they're scoped to a single pod and broken out by container where possible" do
      pod = Map.new(Metrics.queries(:pod))

      for {key, query} <- pod do
        assert query =~ ~s|cluster="${cluster}",namespace="${namespace}",pod="${name}"|,
               "pod.#{key} isn't scoped to the pod: #{query}"
      end

      for key <- ~w(cpu cpu_requests cpu_limits cpu_throttling memory memory_requests memory_limits
                    ephemeral_storage ephemeral_storage_requests ephemeral_storage_limits fs_reads fs_writes restarts)a do
        assert pod[key] =~ "by (container)", "pod.#{key} isn't broken out by container"
      end

      assert pod[:ephemeral_storage_limits] =~ ~s|resource="ephemeral_storage",unit="byte"|
      assert pod[:memory_limits] =~ ~s|resource="memory",unit="byte"|
      refute pod[:network_receive] =~ "container!="
      refute pod[:network_receive] =~ "by (container)"
    end

    test "every templated query is fully substituted regardless of variable order" do
      vars = [cluster: "c", namespace: "ns", name: "pod-1", regex: "-[0-9]+", rate: "5m", instance: "n", filter: ""]

      for scope <- [:cluster, :node, :component, :service, :pod, :noisy],
          order <- [vars, Enum.reverse(vars)],
          {key, query} <- Metrics.queries(scope) do
        result = Client.variable_subst(query, order)
        refute result =~ @unsubstituted, "#{scope}.#{key} left a variable unsubstituted: #{result}"
      end

      result = Client.variable_subst(Map.new(Metrics.queries(:pod))[:memory], Enum.reverse(vars))
      assert result =~ ~s|cluster="c",namespace="ns",pod="pod-1"|
    end
  end

  describe "cluster and node summary queries" do
    test "cluster cpu and memory fall back to kubelet resource metrics without node-exporter" do
      cluster = Map.new(Metrics.queries(:cluster))

      assert cluster[:cpu] =~ ~s|(1 - avg(irate(node_cpu_seconds_total{mode="idle",cluster="${cluster}"}[${rate}]))) or (|
      assert cluster[:cpu] =~
        ~s|sum(max by (node) (rate(node_cpu_usage_seconds_total{cluster="${cluster}"}[${rate}]))) / sum(max by (node) (kube_node_status_capacity{resource="cpu",unit="core",cluster="${cluster}"}))|
      assert cluster[:memory] =~
        ~s|) or (sum(max by (node) (node_memory_working_set_bytes{cluster="${cluster}"})) / sum(max by (node) (kube_node_status_capacity{resource="memory",unit="byte",cluster="${cluster}"})))|
    end

    test "node queries are cluster scoped and fall back to node capacity for machine_* series" do
      node = Map.new(Metrics.queries(:node))
      sel = ~s|cluster="${cluster}",node="${instance}"|

      for {key, query} <- node, do: assert(query =~ sel, "node.#{key} isn't cluster and node scoped: #{query}")

      assert node[:cpu] =~
        ~s|/ (max(machine_cpu_cores{#{sel}}) or max(kube_node_status_capacity{resource="cpu",unit="core",#{sel}}))|
      assert node[:memory] =~
        ~s|/ (max(machine_memory_bytes{#{sel}}) or max(kube_node_status_capacity{resource="memory",unit="byte",#{sel}}))|
    end
  end

  describe "cluster usage queries" do
    @groupings [cluster: "by ()", namespace: "by (namespace)", node: "by (node)"]

    test "every query is broken out by the grouping and fully substituted" do
      vars = [cluster: "c", rate: "5m"]

      for {grouping, by} <- @groupings, {key, query} <- Metrics.queries(:cluster_usage, grouping) do
        assert query =~ ~s|cluster="${cluster}"|, "#{grouping}.#{key} isn't cluster scoped: #{query}"
        assert String.starts_with?(query, ["sum #{by} (", "max #{by} ("]), "#{grouping}.#{key} isn't grouped #{by}: #{query}"
        refute Client.variable_subst(query, vars) =~ "$", "#{grouping}.#{key} left a variable unsubstituted"
      end
    end

    test "reservations keep the grouping label through the kube-state-metrics dedupe" do
      node = Map.new(Metrics.queries(:cluster_usage, :node))
      ns   = Map.new(Metrics.queries(:cluster_usage, :namespace))

      assert node[:cpu_requests] ==
        ~s|sum by (node) (max by (namespace, pod, container, node) (kube_pod_container_resource_requests{resource="cpu",unit="core",container!="",cluster="${cluster}"}))|
      assert ns[:memory_limits] ==
        ~s|sum by (namespace) (max by (namespace, pod, container) (kube_pod_container_resource_limits{resource="memory",unit="byte",container!="",cluster="${cluster}"}))|
    end

    test "node-less kube-state-metrics series borrow node from kube_pod_info" do
      node = Map.new(Metrics.queries(:cluster_usage, :node))
      ns   = Map.new(Metrics.queries(:cluster_usage, :namespace))

      for key <- ~w(pods_running pods_pending restarts)a do
        assert node[key] =~ "group_left (node) max by (namespace, pod, node) (kube_pod_info{", "node.#{key} isn't joined"
        refute ns[key] =~ "kube_pod_info", "namespace.#{key} shouldn't need a join"
      end
    end

    test "volume fullness reports the fullest volume rather than an aggregate ratio" do
      ns = Map.new(Metrics.queries(:cluster_usage, :namespace))

      assert ns[:volume_fullness] ==
        ~s|max by (namespace) (kubelet_volume_stats_used_bytes{cluster="${cluster}"} / kubelet_volume_stats_capacity_bytes{cluster="${cluster}"})|
    end

    test "allocatable capacity is only offered where it's meaningful" do
      refute Keyword.has_key?(Metrics.queries(:cluster_usage, :namespace), :cpu_allocatable)
      assert Keyword.has_key?(Metrics.queries(:cluster_usage, :node), :memory_allocatable)
      assert Keyword.has_key?(Metrics.queries(:cluster_usage, :cluster), :cpu_allocatable)
    end
  end

  describe "node usage queries" do
    @host_keys ~w(cpu_utilization cpu_modes cpu_cores load1 load5 load15 memory_total memory_used memory_cached
                  major_page_faults filesystem_fullness disk_read disk_write disk_busy network_receive
                  network_transmit network_errors network_dropped)a

    @grouped_keys ~w(cpu cpu_requests cpu_limits memory memory_requests memory_limits oom_kills pods_running restarts)a

    test "every query is scoped to the node and fully substituted" do
      vars = [cluster: "c", node: "node-1", rate: "5m"]

      for grouping <- [:node, :namespace, :pod], {key, query} <- Metrics.queries(:node_usage, grouping) do
        assert query =~ ~s|cluster="${cluster}"|, "#{grouping}.#{key} isn't cluster scoped: #{query}"
        assert query =~ ~s|node="${node}"| or query =~ ~s|nodename="${node}"|,
               "#{grouping}.#{key} isn't node scoped: #{query}"
        refute Client.variable_subst(query, vars) =~ @unsubstituted, "#{grouping}.#{key} left a variable unsubstituted"
      end
    end

    test "label_replace's capture reference survives substitution" do
      query = Keyword.fetch!(Metrics.queries(:node_usage, :node), :cpu_utilization)
      assert Client.variable_subst(query, cluster: "c", node: "n", rate: "5m") =~
        ~s|label_replace(node_cpu_seconds_total{mode="idle",cluster="c"}, "internal_ip", "$1", "instance", "(.+):[0-9]+")|
    end

    test "pod usage is grouped while host and capacity series stay node-wide" do
      for {grouping, by} <- [node: "by ()", namespace: "by (namespace)", pod: "by (namespace, pod)"] do
        queries = Metrics.queries(:node_usage, grouping)

        for {key, query} <- queries do
          case key in @grouped_keys do
            true -> assert String.starts_with?(query, "sum #{by} ("), "#{grouping}.#{key} isn't grouped #{by}: #{query}"
            false -> assert query == Keyword.fetch!(Metrics.queries(:node_usage, :node), key), "#{grouping}.#{key} changed with grouping"
          end
        end
      end
    end

    test "node-exporter series are matched on every common node labeling" do
      node = Map.new(Metrics.queries(:node_usage, :node))

      for key <- @host_keys, matcher <- [~s|instance="${node}"|, ~s|nodename="${node}"|, ~s|,node="${node}"|] do
        assert node[key] =~ "and on (instance) max by (instance) (", "node_usage.#{key} isn't matched by instance"
        assert node[key] =~ matcher, "node_usage.#{key} doesn't try #{matcher}"
        assert node[key] =~ ~s|node_uname_info{cluster="${cluster}",nodename="${node}"}|,
               "node_usage.#{key} doesn't fall back to node_uname_info"
        assert node[key] =~ ~s|and on (internal_ip) kube_node_info{cluster="${cluster}",node="${node}"}|,
               "node_usage.#{key} doesn't fall back to the node's internal ip"
      end
    end

    test "host cpu and memory fall back to kubelet resource metrics and node capacity without node-exporter" do
      node = Map.new(Metrics.queries(:node_usage, :node))
      sel = ~s|cluster="${cluster}",node="${node}"|

      assert node[:cpu_utilization] =~
        ~s|) or (max(rate(node_cpu_usage_seconds_total{#{sel}}[${rate}])) / max(kube_node_status_capacity{resource="cpu",unit="core",#{sel}}))|
      assert node[:cpu_cores] =~ ~s|) or max(machine_cpu_cores{#{sel}}) or max(kube_node_status_capacity{resource="cpu",unit="core",#{sel}})|
      assert node[:memory_total] =~
        ~s|) or max(machine_memory_bytes{#{sel}}) or max(kube_node_status_capacity{resource="memory",unit="byte",#{sel}})|
      assert node[:memory_used] =~ ~s|) or max(node_memory_working_set_bytes{#{sel}})|

      for key <- ~w(cpu_modes load1 memory_cached disk_read network_receive)a,
        do: refute(node[key] =~ " or max(", "node_usage.#{key} has no node-exporter-free equivalent")
    end

    test "kubernetes series use the node label and dedupe reservations" do
      node = Map.new(Metrics.queries(:node_usage, :node))
      pod = Map.new(Metrics.queries(:node_usage, :pod))

      assert node[:cpu_requests] ==
        ~s|sum by () (max by (namespace, pod, container) (kube_pod_container_resource_requests{resource="cpu",unit="core",container!="",cluster="${cluster}",node="${node}"}))|
      assert pod[:memory_requests] =~ ~s|sum by (namespace, pod) (max by (namespace, pod, container) (|
      assert node[:conditions] =~ "max by (condition) (kube_node_status_condition{"

      for key <- ~w(pods_running restarts)a do
        assert node[key] =~ ~s|group_left () max by (namespace, pod) (kube_pod_info{cluster="${cluster}",node="${node}"})|,
               "node_usage.#{key} isn't joined to the node's pods"
      end
    end

    test "host filters keep their regex alternation intact" do
      node = Map.new(Metrics.queries(:node_usage, :node))

      assert node[:filesystem_fullness] =~ ~s|fstype!~"tmpfs\|overlay\|squashfs|
      assert node[:network_receive] =~ ~s|device!~"lo\|veth.*\||
    end
  end

  describe "service usage queries" do
    test "every query is namespace scoped, grouped, and fully substituted" do
      vars = [cluster: "c", namespace: "ns", rate: "5m"]

      for grouping <- [:service, :pod], {key, query} <- Metrics.queries(:service_usage, grouping) do
        by =
          case {grouping, key} do
            {:service, _} -> "by ()"
            {:pod, k} when k in ~w(volume_usage volume_capacity volume_fullness)a -> "by (persistentvolumeclaim)"
            {:pod, _} -> "by (pod)"
          end

        assert query =~ ~s|cluster="${cluster}",namespace="${namespace}"|, "#{grouping}.#{key} isn't namespace scoped: #{query}"
        assert String.starts_with?(query, ["sum #{by} (", "max #{by} ("]), "#{grouping}.#{key} isn't grouped #{by}: #{query}"
        refute Client.variable_subst(query, vars) =~ "$", "#{grouping}.#{key} left a variable unsubstituted"
      end
    end

    test "services offer no node allocatable capacity" do
      for grouping <- [:service, :pod] do
        refute Keyword.has_key?(Metrics.queries(:service_usage, grouping), :cpu_allocatable)
        refute Keyword.has_key?(Metrics.queries(:service_usage, grouping), :memory_allocatable)
      end
    end
  end

  describe "Prometheus.Client.variable_subst/2" do
    test "it matches whole variable names in a single pass" do
      assert Client.variable_subst(~s|a="${name}",b="${namespace}"|, name: "x", namespace: "y") ==
        ~s|a="x",b="y"|
      assert Client.variable_subst(~s|a="${name}${regex}"|, regex: ".*", name: "x") == ~s|a="x.*"|
    end

    test "it supports bare grafana-style variables from dashboards" do
      vars = [%{name: "env", value: "prod"}, %{name: "environment", value: "staging"}]
      assert Client.variable_subst(~s|up{env="$env",e="$environment"}|, vars) ==
        ~s|up{env="prod",e="staging"}|
    end

    test "it leaves unknown variables alone and never re-scans substituted values" do
      assert Client.variable_subst(~s|x="${missing}",y="$other",z="${a}"|, a: "${missing}") ==
        ~s|x="${missing}",y="$other",z="${missing}"|
    end
  end
end
