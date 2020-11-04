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
end