defmodule Console.GraphQl.KubernetesQueriesTest do
  use Console.DataCase, async: true
  use Mimic
  import KubernetesScaffolds

  describe "statefulSet" do
    test "it can fetch statefulsets by namespace/name" do
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
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
      """, %{}, %{current_user: user})

      assert stateful["metadata"]["name"] == "name"
      assert stateful["status"]["replicas"] == 3
      assert stateful["status"]["currentReplicas"] == 3
      assert stateful["spec"]["serviceName"] == "name"
    end
  end

  describe "deployment" do
    test "it can fetch deployments by namespace/name" do
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
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
      """, %{}, %{current_user: user})


      assert deployment["metadata"]["name"] == "name"
      assert deployment["status"]["replicas"] == 3
      assert deployment["status"]["readyReplicas"] == 3
      assert deployment["spec"]["replicas"] == 3
    end
  end

  describe "service" do
    test "it can fetch services by namespace/name" do
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
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
      """, %{}, %{current_user: user})

      assert service["metadata"]["name"] == "name"
      assert service["status"]["loadBalancer"]["ingress"] == [%{"ip" => "1.2.3.4"}]
      assert service["spec"]["type"] == "LoadBalancer"
    end
  end

  describe "ingress" do
    test "it can fetch ingresses by namespace/name" do
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
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
      """, %{}, %{current_user: user})

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
              allocatable
              capacity
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
              allocatable
              capacity
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
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
      expect(Kazan, :run, fn _ -> {:ok, cron("cron")} end)

      {:ok, %{data: %{"cronJob" => cron}}} = run_query("""
        query Cron($name: String!) {
          cronJob(name: $name, namespace: $name) {
            metadata { name }
            status { lastScheduleTime }
            spec { schedule suspend concurrencyPolicy }
          }
        }
      """, %{"name" => "cron"}, %{current_user: user})

      assert cron["metadata"]["name"] == "cron"
      assert cron["status"]["lastScheduleTime"]
      assert cron["spec"]["schedule"] == "* * * * *"
      refute cron["spec"]["suspend"]
      assert cron["spec"]["concurrencyPolicy"] == "Forbid"
    end
  end

  describe "job" do
    test "it can read a job" do
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
      expect(Kazan, :run, fn _ -> {:ok, job("job")} end)

      {:ok, %{data: %{"job" => job}}} = run_query("""
        query Cron($name: String!) {
          job(name: $name, namespace: $name) {
            metadata { name }
            status { active }
            spec { parallelism backoffLimit }
          }
        }
      """, %{"name" => "job"}, %{current_user: user})

      assert job["metadata"]["name"] == "job"
      assert job["status"]["active"]
      assert job["spec"]["parallelism"] == 1
      assert job["spec"]["backoffLimit"] == 5
    end
  end

  describe "certificate" do
    test "it can read a certificate crd" do
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
      expect(Kazan, :run, fn _ -> {:ok, certificate("certificate")} end)

      {:ok, %{data: %{"certificate" => certificate}}} = run_query("""
        query Cron($name: String!) {
          certificate(name: $name, namespace: $name) {
            metadata { name }
            status { renewalTime }
            spec { dnsNames secretName }
            raw
          }
        }
      """, %{"name" => "certificate"}, %{current_user: user})

      assert certificate["metadata"]["name"] == "certificate"
      assert certificate["status"]["renewalTime"]
      assert certificate["spec"]["dnsNames"] == ["some.example.com"]
      assert certificate["spec"]["secretName"] == "example-tls"
      assert certificate["raw"]
    end
  end

  describe "pod" do
    test "it can query an individual pod" do
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
      expect(Kazan, :run, fn _ -> {:ok, pod("name")} end)

      {:ok, %{data: %{"pod" => pod}}} = run_query("""
        query Pod($name: String!) {
          pod(name: $name, namespace: $name) {
            metadata { name }
            status { podIp }
            spec { nodeName }
          }
        }
      """, %{"name" => "name"}, %{current_user: user})

      assert pod["metadata"]["name"] == "name"
      assert pod["status"]["podIp"]
      assert pod["spec"]["nodeName"]
    end
  end

  describe "logfilters" do
    test "it can query logfilters" do
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
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
      """, %{"name" => "name"}, %{current_user: user})

      assert filter["metadata"]["name"] == "name"
      assert filter["spec"]["query"]
      assert hd(filter["spec"]["labels"])["name"]
      assert hd(filter["spec"]["labels"])["value"]
    end
  end

  describe "clusterInfo" do
    test "it will fetch kubernetes cluster info" do
      user = insert(:user)
      expect(Kazan, :run, fn _ -> {:ok, version_info()} end)

      {:ok, %{data: %{"clusterInfo" => info}}} = run_query("""
        query { clusterInfo { gitCommit version platform } }
      """, %{}, %{current_user: user})

      assert info["gitCommit"]
      assert info["version"] == "12.01"
      assert info["platform"]
    end
  end

  describe "nodeMetrics" do
    test "it can list metrics" do
      user = insert(:user)
      expect(Kazan, :run, fn _ -> {:ok, %{items: [node_metrics("node-1")]}} end)

      {:ok, %{data: %{"nodeMetrics" => [node]}}} = run_query("""
        query { nodeMetrics { usage { cpu memory } } }
      """, %{}, %{current_user: user})

      assert node["usage"]["cpu"] == "1"
      assert node["usage"]["memory"] == "2M"
    end
  end

  describe "nodeMetric" do
    test "it can fetch metrics for a node" do
      user = insert(:user)
      expect(Kazan, :run, fn _ -> {:ok, node_metrics("node-1")} end)

      {:ok, %{data: %{"nodeMetric" => node}}} = run_query("""
        query { nodeMetric(name: "node-1") { usage { cpu memory } } }
      """, %{}, %{current_user: user})

      assert node["usage"]["cpu"] == "1"
      assert node["usage"]["memory"] == "2M"
    end
  end

  describe "configurationOverlays" do
    test "it can fetch the overlays for a namespace" do
      user = insert(:user)
      expect(Kazan, :run, fn _ -> {:ok, %{items: [configuration_overlay("name", name: "config")]}} end)

      {:ok, %{data: %{"configurationOverlays" => [overlay]}}} = run_query("""
        query Overlays($ns: String!) {
          configurationOverlays(namespace: $ns) {
            spec { name }
          }
        }
      """, %{"ns" => "name"}, %{current_user: user})

      assert overlay["spec"]["name"] == "config"
    end
  end

  describe "namespaces" do
    test "it will fetch all namespaces" do
      user = insert(:user)
      expect(Console, :namespaces, fn -> [namespace_scaffold("test")] end)

      {:ok, %{data: %{"namespaces" => [namespace]}}} = run_query("""
        query {
          namespaces {
            metadata { name }
            status { phase }
            spec { finalizers }
          }
        }
      """, %{}, %{current_user: user})

      assert namespace["metadata"]["name"] == "test"
      assert namespace["status"]["phase"] == "Created"
      assert namespace["spec"]["finalizers"] == ["finalizer"]
    end
  end
end
