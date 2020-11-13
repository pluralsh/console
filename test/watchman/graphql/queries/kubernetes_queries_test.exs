defmodule Watchman.GraphQl.KubernetesQueriesTest do
  use Watchman.DataCase, async: true
  use Mimic
  import Watchman.KubernetesScaffolds

  describe "statefulSet" do
    test "it can fetch statefulsets by namespace/name" do
      expect(Kazan, :run, fn _ -> {:ok, stateful_set("namespace", "name")} end)

      {:ok, %{data: %{"statefulSet" => stateful}}} = run_query("""
        query {
          statefulSet(namespace: "namespace", name: "name") {
            metadata { name }
            status {
              replicas
              currentReplicas
            }
            spec {
              replicas
              serviceName
            }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert stateful["metadata"]["name"] == "name"
      assert stateful["status"]["replicas"] == 3
      assert stateful["status"]["currentReplicas"] == 3
      assert stateful["spec"]["serviceName"] == "name"
    end
  end

  describe "deployment" do
    test "it can fetch deployments by namespace/name" do
      expect(Kazan, :run, fn _ -> {:ok, deployment("namespace", "name")} end)

      {:ok, %{data: %{"deployment" => deployment}}} = run_query("""
        query {
          deployment(namespace: "namespace", name: "name") {
            metadata { name }
            status {
              replicas
              readyReplicas
            }
            spec {
              replicas
            }
          }
        }
      """, %{}, %{current_user: insert(:user)})


      assert deployment["metadata"]["name"] == "name"
      assert deployment["status"]["replicas"] == 3
      assert deployment["status"]["readyReplicas"] == 3
      assert deployment["spec"]["replicas"] == 3
    end
  end

  describe "service" do
    test "it can fetch services by namespace/name" do
      expect(Kazan, :run, fn _ -> {:ok, service("namespace", "name")} end)

      {:ok, %{data: %{"service" => service}}} = run_query("""
        query {
          service(namespace: "namespace", name: "name") {
            metadata { name }
            status {
              loadBalancer { ingress { ip } }
            }
            spec {
              type
            }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert service["metadata"]["name"] == "name"
      assert service["status"]["loadBalancer"]["ingress"] == [%{"ip" => "1.2.3.4"}]
      assert service["spec"]["type"] == "LoadBalancer"
    end
  end

  describe "ingress" do
    test "it can fetch ingresses by namespace/name" do
      expect(Kazan, :run, fn _ -> {:ok, ingress("namespace", "name")} end)

      {:ok, %{data: %{"ingress" => ingress}}} = run_query("""
        query {
          ingress(namespace: "namespace", name: "name") {
            metadata { name }
            status {
              loadBalancer { ingress { ip } }
            }
            spec {
              tls { hosts }
              rules {
                host
                http {
                  paths { path }
                }
              }
            }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert ingress["metadata"]["name"] == "name"
      assert ingress["status"]["loadBalancer"]["ingress"] == [%{"ip" => "1.2.3.4"}]
      assert ingress["spec"]["tls"] == [%{"hosts" => ["example.com"]}]
      assert ingress["spec"]["rules"] == [%{"host" => "example.com", "http" => %{"paths" => [%{"path" => "*"}]}}]
    end
  end

  describe "nodes" do
    test "it can list nodes for a cluster" do
      expect(Kazan, :run, fn _ -> {:ok, %{items: [kube_node()]}} end)

      {:ok, %{data: %{"nodes" => [node]}}} = run_query("""
        query {
          nodes {
            metadata { name }
            status {
              allocatable { cpu memory }
              capacity { cpu memory }
            }
            spec { providerId }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert node["metadata"]["name"]
      assert node["status"]["allocatable"]["cpu"]
      assert node["status"]["allocatable"]["memory"]
      assert node["status"]["capacity"]["cpu"]
      assert node["status"]["capacity"]["memory"]
      assert node["spec"]["providerId"]
    end
  end

  describe "node" do
    test "it can resolve a node in the cluster" do
      expect(Kazan, :run, fn _ -> {:ok, kube_node()} end)

      {:ok, %{data: %{"node" => node}}} = run_query("""
        query Node($name: String!) {
          node(name: $name) {
            metadata { name }
            status {
              allocatable { cpu memory }
              capacity { cpu memory }
            }
            spec { providerId }
          }
        }
      """, %{"name" => "node"}, %{current_user: insert(:user)})

      assert node["metadata"]["name"]
      assert node["status"]["allocatable"]["cpu"]
      assert node["status"]["allocatable"]["memory"]
      assert node["status"]["capacity"]["cpu"]
      assert node["status"]["capacity"]["memory"]
      assert node["spec"]["providerId"]
    end
  end

  describe "cronJob" do
    test "it can read a cron job" do
      expect(Kazan, :run, fn _ -> {:ok, cron("cron")} end)

      {:ok, %{data: %{"cronJob" => cron}}} = run_query("""
        query Cron($name: String!) {
          cronJob(name: $name, namespace: $name) {
            metadata { name }
            status { lastScheduleTime }
            spec { schedule suspend concurrencyPolicy }
          }
        }
      """, %{"name" => "cron"}, %{current_user: insert(:user)})

      assert cron["metadata"]["name"] == "cron"
      assert cron["status"]["lastScheduleTime"]
      assert cron["spec"]["schedule"] == "* * * * *"
      refute cron["spec"]["suspend"]
      assert cron["spec"]["concurrencyPolicy"] == "Forbid"
    end
  end

  describe "pod" do
    test "it can query an individual pod" do
      expect(Kazan, :run, fn _ -> {:ok, pod("name")} end)

      {:ok, %{data: %{"pod" => pod}}} = run_query("""
        query Pod($name: String!) {
          pod(name: $name, namespace: $name) {
            metadata { name }
            status { podIp }
            spec { nodeName }
          }
        }
      """, %{"name" => "name"}, %{current_user: insert(:user)})

      assert pod["metadata"]["name"] == "name"
      assert pod["status"]["podIp"]
      assert pod["spec"]["nodeName"]
    end
  end

  describe "logfilters" do
    test "it can query logfilters" do
      expect(Kazan, :run, fn _ -> {:ok, %{items: [logfilter("name")]}} end)

      {:ok, %{data: %{"logFilters" => [filter]}}} = run_query("""
        query LogFilter($name: String!) {
          logFilters(namespace: $name) {
            metadata { name }
            spec {
              query
              labels { name value }
            }
          }
        }
      """, %{"name" => "name"}, %{current_user: insert(:user)})

      assert filter["metadata"]["name"] == "name"
      assert filter["spec"]["query"]
      assert hd(filter["spec"]["labels"])["name"]
      assert hd(filter["spec"]["labels"])["value"]
    end
  end
end