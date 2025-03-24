defmodule Console.GraphQl.KubernetesQueriesTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Deployments.Clusters
  import KubernetesScaffolds

  setup do
    bot("console")
    :ok
  end

  describe "statefulSet" do
    test "it can fetch statefulsets by namespace/name" do
      user = insert(:user)
      svc = insert(:service, namespace: "namespace", read_bindings: [%{user_id: user.id}])
      insert(:service_component, service: svc, group: "apps", version: "v1", kind: "StatefulSet", namespace: "namespace", name: "name")
      expect(Kazan, :run, fn _, _ -> {:ok, stateful_set("namespace", "name")} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"statefulSet" => stateful}}} = run_query("""
        query statefulSet($serviceId: ID!) {
          statefulSet(serviceId: $serviceId, namespace: "namespace", name: "name") {
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
      """, %{"serviceId" => svc.id}, %{current_user: user})

      assert stateful["metadata"]["name"] == "name"
      assert stateful["status"]["replicas"] == 3
      assert stateful["status"]["currentReplicas"] == 3
      assert stateful["spec"]["serviceName"] == "name"
    end

    test "it won't choke on errors" do
      user = insert(:user)
      svc = insert(:service, namespace: "namespace", read_bindings: [%{user_id: user.id}])
      insert(:service_component, service: svc, group: "apps", version: "v1", kind: "StatefulSet", namespace: "namespace", name: "name")
      expect(Kazan, :run, fn _, _ -> {:error, {:http_error, 404, "an error"}} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query statefulSet($serviceId: ID!) {
          statefulSet(serviceId: $serviceId, namespace: "namespace", name: "name") {
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
      """, %{"serviceId" => svc.id}, %{current_user: user})
    end
  end

  describe "deployment" do
    test "it can fetch deployments by namespace/name" do
      user = insert(:user)
      svc = insert(:service, namespace: "namespace", read_bindings: [%{user_id: user.id}])
      insert(:service_component, service: svc, group: "apps", version: "v1", kind: "Deployment", namespace: "namespace", name: "name")
      expect(Kazan, :run, fn _, _ -> {:ok, deployment("namespace", "name")} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"deployment" => deployment}}} = run_query("""
        query deployment($serviceId: ID!) {
          deployment(serviceId: $serviceId, namespace: "namespace", name: "name") {
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
      """, %{"serviceId" => svc.id}, %{current_user: user})


      assert deployment["metadata"]["name"] == "name"
      assert deployment["status"]["replicas"] == 3
      assert deployment["status"]["readyReplicas"] == 3
      assert deployment["spec"]["replicas"] == 3
    end
  end

  describe "service" do
    test "it can fetch services by namespace/name" do
      user = insert(:user)
      svc = insert(:service, namespace: "namespace", read_bindings: [%{user_id: user.id}])
      insert(:service_component, service: svc, group: nil, version: "v1", kind: "Service", namespace: "namespace", name: "name")
      expect(Kazan, :run, fn _, _ -> {:ok, service("namespace", "name")} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"service" => service}}} = run_query("""
        query service($serviceId: ID!) {
          service(serviceId: $serviceId, namespace: "namespace", name: "name") {
            metadata { name }
            status {
              loadBalancer { ingress { ip } }
            }
            spec {
              type
            }
          }
        }
      """, %{"serviceId" => svc.id}, %{current_user: user})

      assert service["metadata"]["name"] == "name"
      assert service["status"]["loadBalancer"]["ingress"] == [%{"ip" => "1.2.3.4"}]
      assert service["spec"]["type"] == "LoadBalancer"
    end
  end

  describe "ingress" do
    test "it can fetch ingresses by namespace/name" do
      user = insert(:user)
      svc = insert(:service, namespace: "namespace", read_bindings: [%{user_id: user.id}])
      insert(:service_component, service: svc, group: "networking.k8s.io", version: "v1", kind: "Ingress", namespace: "namespace", name: "name")
      expect(Kazan, :run, fn _, _ -> {:ok, ingress("namespace", "name")} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"ingress" => ingress}}} = run_query("""
        query ingress($serviceId: ID!) {
          ingress(serviceId: $serviceId, namespace: "namespace", name: "name") {
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
      """, %{"serviceId" => svc.id}, %{current_user: user})

      assert ingress["metadata"]["name"] == "name"
      assert ingress["status"]["loadBalancer"]["ingress"] == [%{"ip" => "1.2.3.4"}]
      assert ingress["spec"]["tls"] == [%{"hosts" => ["example.com"]}]
      assert ingress["spec"]["rules"] == [%{"host" => "example.com", "http" => %{"paths" => [%{"path" => "*"}]}}]
    end
  end


  describe "node" do
    test "it can resolve a node in the cluster" do
      cluster = insert(:cluster)
      expect(Kazan, :run, fn _, _ -> {:ok, kube_node()} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"node" => node}}} = run_query("""
        query Node($clusterId: ID!, $name: String!) {
          node(clusterId: $clusterId, name: $name) {
            metadata { name }
            status {
              allocatable
              capacity
            }
            spec { providerId }
          }
        }
      """, %{"clusterId" => cluster.id, "name" => "node"}, %{current_user: admin_user()})

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
      svc = insert(:service, namespace: "cron", read_bindings: [%{user_id: user.id}])
      insert(:service_component, service: svc, group: "batch", version: "v1", kind: "CronJob", namespace: "cron", name: "cron")
      expect(Kazan, :run, fn _, _ -> {:ok, cron("cron")} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"cronJob" => cron}}} = run_query("""
        query Cron($serviceId: ID!, $name: String!) {
          cronJob(serviceId: $serviceId, name: $name, namespace: $name) {
            metadata { name }
            status { lastScheduleTime }
            spec { schedule suspend concurrencyPolicy }
          }
        }
      """, %{"name" => "cron", "serviceId" => svc.id}, %{current_user: user})

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
      svc = insert(:service, namespace: "job", read_bindings: [%{user_id: user.id}])
      insert(:service_component, service: svc, group: "batch", version: "v1", kind: "Job", namespace: "job", name: "job")
      expect(Kazan, :run, fn _, _ -> {:ok, job("job")} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"job" => job}}} = run_query("""
        query Cron($serviceId: ID!, $name: String!) {
          job(serviceId: $serviceId, name: $name, namespace: $name) {
            metadata { name }
            status { active }
            spec { parallelism backoffLimit }
          }
        }
      """, %{"serviceId" => svc.id, "name" => "job"}, %{current_user: user})

      assert job["metadata"]["name"] == "job"
      assert job["status"]["active"]
      assert job["spec"]["parallelism"] == 1
      assert job["spec"]["backoffLimit"] == 5
    end
  end

  describe "certificate" do
    @tag :skip
    test "it can read a certificate crd" do
      user = insert(:user)
      expect(Kube.Client, :get_certificate, fn _, _ -> {:ok, certificate("certificate")} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

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
      svc = insert(:service, namespace: "name", read_bindings: [%{user_id: user.id}])
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)
      expect(Kazan, :run, fn _, _ -> {:ok, pod("name")} end)

      {:ok, %{data: %{"pod" => pod}}} = run_query("""
        query Pod($serviceId: ID!, $name: String!) {
          pod(serviceId: $serviceId, name: $name, namespace: $name) {
            metadata { name }
            status { podIp }
            spec { nodeName }
          }
        }
      """, %{"serviceId" => svc.id, "name" => "name"}, %{current_user: user})

      assert pod["metadata"]["name"] == "name"
      assert pod["status"]["podIp"]
      assert pod["spec"]["nodeName"]
    end

    test "it can query logs for a pod" do
      user = insert(:user)
      svc = insert(:service, namespace: "name", read_bindings: [%{user_id: user.id}])
      expect(Kazan, :run, 2, fn
        %{path: "/api/v1/namespaces/name/pods/name/log"}, _ -> {:ok, "some logs\nreturned"}
        _, _ -> {:ok, pod("name")}
      end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"pod" => pod}}} = run_query("""
        query Pod($serviceId: ID!, $name: String!) {
          pod(serviceId: $serviceId, name: $name, namespace: $name) {
            metadata { name }
            status { podIp }
            spec { nodeName }
            logs(container: "test", sinceSeconds: 5)
          }
        }
      """, %{"serviceId" => svc.id, "name" => "name"}, %{current_user: user})

      assert pod["metadata"]["name"] == "name"
      assert pod["status"]["podIp"]
      assert pod["spec"]["nodeName"]
      [first, second] = pod["logs"]
      assert first == "some logs"
      assert second == "returned"
    end

    test "it can query pod logs w/ cd auth" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)
      expect(Kube.Utils, :run, 2, fn
        %{path: "/api/v1/namespaces/name/pods/name/log"} -> {:ok, "some logs\nreturned"}
        _ -> {:ok, pod("name")}
      end)

      {:ok, %{data: %{"pod" => pod}}} = run_query("""
        query Pod($name: String!, $clusterId: ID!) {
          pod(name: $name, namespace: $name, clusterId: $clusterId) {
            metadata { name }
            status { podIp }
            spec { nodeName }
            logs(container: "test", sinceSeconds: 5)
          }
        }
      """, %{"name" => "name", "clusterId" => cluster.id}, %{current_user: user})

      assert pod["metadata"]["name"] == "name"
      assert pod["status"]["podIp"]
      assert pod["spec"]["nodeName"]
      [first, second] = pod["logs"]
      assert first == "some logs"
      assert second == "returned"
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
      user = admin_user()
      cluster = insert(:cluster)
      expect(Kazan, :run, fn _, _ -> {:ok, %{items: [node_metrics("node-1")]}} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"nodeMetrics" => [node]}}} = run_query("""
        query nodeMetrics($clusterId: ID!) {
          nodeMetrics(clusterId: $clusterId) {
            usage { cpu memory }
          }
        }
      """, %{"clusterId" => cluster.id}, %{current_user: user})

      assert node["usage"]["cpu"] == "1"
      assert node["usage"]["memory"] == "2M"
    end
  end

  describe "nodeMetric" do
    test "it can fetch metrics for a node" do
      user = admin_user()
      cluster = insert(:cluster)
      expect(Kazan, :run, fn _, _ -> {:ok, node_metrics("node-1")} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"nodeMetric" => node}}} = run_query("""
        query nodeMetric($clusterId: ID!) {
          nodeMetric(clusterId: $clusterId, name: "node-1") {
            usage { cpu memory }
          }
        }
      """, %{"clusterId" => cluster.id}, %{current_user: user})

      assert node["usage"]["cpu"] == "1"
      assert node["usage"]["memory"] == "2M"
    end
  end

  describe "namespaces" do
    test "it will fetch all namespaces" do
      cluster = insert(:cluster)
      expect(Kazan, :run, fn _, _ -> {:ok, %{items: [namespace_scaffold("test")]}} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"namespaces" => [namespace]}}} = run_query("""
        query namespaces($clusterId: ID!) {
          namespaces(clusterId: $clusterId) {
            metadata { name }
            status { phase }
            spec { finalizers }
          }
        }
      """, %{"clusterId" => cluster.id}, %{current_user: admin_user()})

      assert namespace["metadata"]["name"] == "test"
      assert namespace["status"]["phase"] == "Created"
      assert namespace["spec"]["finalizers"] == ["finalizer"]
    end
  end

  describe "configMap" do
    test "users can view config maps" do
      user = admin_user()
      svc = insert(:service, namespace: "name", read_bindings: [%{user_id: user.id}])
      insert(:service_component, service: svc, group: nil, version: "v1", kind: "ConfigMap", namespace: "name", name: "name")
      expect(Kazan, :run, fn _, _ -> {:ok, config_map("name")} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"configMap" => conf}}} = run_query("""
        query Conf($serviceId: ID!, $name: String!) {
          configMap(serviceId: $serviceId, namespace: $name, name: $name) {
            metadata { name }
            data
          }
        }
      """, %{"serviceId" => svc.id, "name" => "name"}, %{current_user: user})

      assert conf["metadata"]["name"] == "name"
      assert conf["data"]["some"] == "config"
    end
  end

  describe "secret" do
    test "admins can view secrets" do
      user = admin_user()
      svc = insert(:service, namespace: "name", read_bindings: [%{user_id: user.id}])
      insert(:service_component, service: svc, group: nil, version: "v1", kind: "Secret", namespace: "name", name: "name")
      expect(Kazan, :run, fn _, _ -> {:ok, secret("name")} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"secret" => conf}}} = run_query("""
        query Conf($serviceId: ID!, $name: String!) {
          secret(serviceId: $serviceId, namespace: $name, name: $name) {
            metadata { name }
            data
          }
        }
      """, %{"serviceId" => svc.id, "name" => "name"}, %{current_user: user})

      assert conf["metadata"]["name"] == "name"
      assert conf["data"]["some"] == "secret"
    end

    test "nonadmins cannot view secrets" do
      user = insert(:user)
      svc = insert(:service, namespace: "name")

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Conf($serviceId: ID!, $name: String!) {
          secret(serviceId: $serviceId, namespace: $name, name: $name) {
            metadata { name }
            data
          }
        }
      """, %{"serviceId" => svc.id, "name" => "name"}, %{current_user: user})
    end
  end

  describe "unstructuredResource" do
    test "it can fetch from a service" do
      user = insert(:user)
      cluster = insert(:cluster, self: true)
      svc = insert(:service, cluster: cluster, read_bindings: [%{user_id: user.id}])
      insert(:service_component, group: nil, namespace: nil, service: svc, kind: "Namespace", name: "test", version: "v1")
      expect(Clusters, :api_discovery, fn _ -> %{} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)
      expect(Kube.Utils, :run, fn
        %{path: "/api/v1/namespaces/test"} ->
          {:ok, %{"apiVersion" => "v1", "kind" => "Namespace", "metadata" => %{"name" => "test"}}}
      end)

      {:ok, %{data: %{"unstructuredResource" => found}}} = run_query("""
        query Unstructured($svc: ID!) {
          unstructuredResource(name: "test", kind: "Namespace", version: "v1", serviceId: $svc) {
            raw
          }
        }
      """, %{"svc" => svc.id}, %{current_user: user})

      assert found["raw"]["apiVersion"] == "v1"
    end

    test "it cannot fetch if the component is missing" do
      user = insert(:user)
      cluster = insert(:cluster, self: true)
      svc = insert(:service, cluster: cluster, read_bindings: [%{user_id: user.id}])
      expect(Clusters, :api_discovery, fn _ -> %{} end)
      expect(Kube.Utils, :run, fn %{path: "/api/v1/namespaces/test"} ->
        {:ok, %{"apiVersion" => "v1", "kind" => "Namespace", "metadata" => %{"name" => "test"}}}
      end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Unstructured($svc: ID!) {
          unstructuredResource(name: "test", kind: "Namespace", version: "v1", serviceId: $svc) {
            raw
          }
        }
      """, %{"svc" => svc.id}, %{current_user: user})
    end
  end

  describe "pluralCluster" do
    test "it can fetch a cluster by ns/name" do
      admin = admin_user()
      cluster = insert(:cluster)
      svc = insert(:service, namespace: "name", read_bindings: [%{user_id: admin.id}])
      insert(:service_component, service: svc, group: "deployments.plural.sh", version: "v1alpha1", kind: "Cluster", namespace: "name", name: "name")
      expect(Kube.Utils, :run, fn _ -> {:ok, plural_cluster("name", cluster.id)} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"pluralCluster" => found}}} = run_query("""
        query Cluster($serviceId: ID!, $name: String!) {
          pluralCluster(serviceId: $serviceId, name: $name, namespace: $name) {
            metadata { name namespace }
            reference { id }
            status { id }
          }
        }
      """, %{"serviceId" => svc.id, "name" => "name"}, %{current_user: admin})

      assert found["metadata"]["name"] == "name"
      assert found["reference"]["id"] == cluster.id
      assert found["status"]["id"] == cluster.id
    end
  end

  describe "pluralServiceDeployment" do
    test "it can fetch a cluster by ns/name" do
      admin = admin_user()
      service = insert(:service)
      svc = insert(:service, namespace: "name", read_bindings: [%{user_id: admin.id}])
      insert(:service_component, service: svc, group: "deployments.plural.sh", version: "v1alpha1", kind: "ServiceDeployment", namespace: "name", name: "name")
      expect(Kube.Utils, :run, fn _ -> {:ok, service_deployment("name", service.id)} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"pluralServiceDeployment" => found}}} = run_query("""
        query service($serviceId: ID!, $name: String!) {
          pluralServiceDeployment(name: $name, namespace: $name, serviceId: $serviceId) {
            metadata { name namespace }
            reference { id }
            status { id }
          }
        }
      """, %{"serviceId" => svc.id, "name" => "name"}, %{current_user: admin})

      assert found["metadata"]["name"] == "name"
      assert found["reference"]["id"] == service.id
      assert found["status"]["id"] == service.id
    end
  end

  describe "pluralGitRepository" do
    test "it can fetch a cluster by ns/name" do
      admin = admin_user()
      git_repository = insert(:git_repository)
      svc = insert(:service, namespace: "name", read_bindings: [%{user_id: admin.id}])
      insert(:service_component, service: svc, group: "deployments.plural.sh", version: "v1alpha1", kind: "GitRepository", namespace: "name", name: "name")
      expect(Kube.Utils, :run, fn _ -> {:ok, git_repository("name", git_repository.id)} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"pluralGitRepository" => found}}} = run_query("""
        query service($serviceId: ID!, $name: String!) {
          pluralGitRepository(serviceId: $serviceId, name: $name, namespace: $name) {
            metadata { name namespace }
            reference { id }
            status { id }
          }
        }
      """, %{"serviceId" => svc.id, "name" => "name"}, %{current_user: admin})

      assert found["metadata"]["name"] == "name"
      assert found["reference"]["id"] == git_repository.id
      assert found["status"]["id"] == git_repository.id
    end
  end
end
