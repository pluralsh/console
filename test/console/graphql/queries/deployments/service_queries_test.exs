defmodule Console.GraphQl.Deployments.ServiceQueriesTest do
  use Console.DataCase, async: true
  use Mimic

  describe "serviceDeployments" do
    test "it can list services in the system" do
      cluster = insert(:cluster)
      services = insert_list(3, :service, cluster: cluster)

      {:ok, %{data: %{"serviceDeployments" => found}}} = run_query("""
        query Services($clusterId: ID!) {
          serviceDeployments(clusterId: $clusterId, first: 5) {
            edges { node { id name } }
          }
        }
      """, %{"clusterId" => cluster.id}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, services)
      assert Enum.all?(found, & &1["name"])
    end

    test "it can list services by project" do
      project = insert(:project)
      insert_list(3, :service)
      services = for _ <- 1..3,
        do: insert(:service, cluster: insert(:cluster, project: project))

      {:ok, %{data: %{"serviceDeployments" => found}}} = run_query("""
        query Services($projectId: ID!) {
          serviceDeployments(projectId: $projectId, first: 5) {
            edges { node { id name } }
          }
        }
      """, %{"projectId" => project.id}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, services)
      assert Enum.all?(found, & &1["name"])
    end

    test "it can sideload helm repositories" do
      cluster = insert(:cluster)
      services = insert_list(3, :service, cluster: cluster)
      svc = insert(:service, cluster: cluster, helm: %{chart: "chart", version: "0.1.0", repository: %{namespace: "ns", name: "name"}})
      expect(Console.Deployments.Git, :cached_helm_repositories, fn ->
        {:ok, [%Kube.HelmRepository{
          metadata: %{namespace: "ns", name: "name"},
          spec: %Kube.HelmRepository.Spec{url: "https://helm.sh"},
        }]}
      end)

      {:ok, %{data: %{"serviceDeployments" => found}}} = run_query("""
        query Services($clusterId: ID!) {
          serviceDeployments(clusterId: $clusterId, first: 5) {
            edges { node {
                id
                helmRepository { spec { url } }
            } }
          }
        }
      """, %{"clusterId" => cluster.id}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, [svc | services])
      assert Enum.any?(found, & &1["helmRepository"])
    end

    test "it can list services in the system by cluster handle" do
      cluster = insert(:cluster, handle: "test")
      services = insert_list(3, :service, cluster: cluster)
      insert_list(3, :service)

      {:ok, %{data: %{"serviceDeployments" => found}}} = run_query("""
        query Services($cluster: String!) {
          serviceDeployments(cluster: $cluster, first: 5) {
            edges { node { id name } }
          }
        }
      """, %{"cluster" => cluster.handle}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, services)
      assert Enum.all?(found, & &1["name"])
    end

    test "it will respect rbac" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      cluster = insert(:cluster, write_bindings: [%{group_id: group.id}])
      svcs  = insert_list(3, :service, cluster: cluster)
      other = insert(:service, read_bindings: [%{user_id: user.id}])
      insert_list(3, :service)

      {:ok, %{data: %{"serviceDeployments" => found}}} = run_query("""
        query {
          serviceDeployments(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([other | svcs])

      {:ok, %{data: %{"serviceDeployments" => found}}} = run_query("""
        query {
          serviceDeployments(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found) == []
    end
  end

  describe "serviceTree" do
    test "it can list services in the system" do
      cluster = insert(:cluster)
      services = insert_list(3, :service, cluster: cluster)
      depth_1 = for s <- services, do: insert(:service, parent: s)
      depth_2 = for s <- depth_1, do: insert(:service, parent: s)
      insert_list(3, :service)

      {:ok, %{data: %{"serviceTree" => found}}} = run_query("""
        query Services($clusterId: ID!) {
          serviceTree(clusterId: $clusterId, first: 20) {
            edges { node { id name } }
          }
        }
      """, %{"clusterId" => cluster.id}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, services ++ depth_1 ++ depth_2)
      assert Enum.all?(found, & &1["name"])
    end
  end


  describe "serviceDeployment" do
    test "it can fetch a services configuration and revisions" do
      user = admin_user()
      cluster = insert(:cluster)
      repository = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}]
      ])
      components = insert_list(3, :service_component, service: service)

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query Service($id: ID!) {
          serviceDeployment(id: $id) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
            revisions(first: 5) { edges { node { id } } }
            components { id group synced state}
          }
        }
      """, %{"id" => service.id}, %{current_user: user})

      assert found["name"] == "test"
      assert found["namespace"] == "test"
      assert found["git"]["ref"] == "master"
      assert found["git"]["folder"] == "k8s"
      [conf] = found["configuration"]
      assert conf["name"] == "name"
      assert conf["value"] == "value"

      [revision] = from_connection(found["revisions"])
      assert revision["id"] == service.revision_id

      assert ids_equal(found["components"], components)
      assert Enum.all?(found["components"], & &1["synced"])
      assert Enum.all?(found["components"], & &1["group"] == "networking.k8s.io")
      assert Enum.all?(found["components"], & &1["state"] == "RUNNING")
    end

    test "it can allow permissions to be propagated from projects" do
      user = insert(:user, service_account: true)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      cluster = insert(:cluster, project: project)
      repository = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}]
      ])

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query Service($cluster: String!, $name: String!) {
          serviceDeployment(cluster: $cluster, name: $name) {
            name
            namespace
            git { ref folder }
            repository { id }
          }
        }
      """, %{"cluster" => service.cluster_id, "name" => service.name}, %{current_user: user})

      assert found["name"] == "test"
      assert found["namespace"] == "test"
      assert found["git"]["ref"] == "master"
      assert found["git"]["folder"] == "k8s"
    end

    test "it can fetch a service by handle/name" do
      user = admin_user()
      cluster = insert(:cluster, handle: "test")
      repository = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}]
      ])

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query Service($cluster: String!, $name: String!) {
          serviceDeployment(cluster: $cluster, name: $name) {
            id
            name
            namespace
          }
        }
      """, %{"cluster" => "test", "name" => "test"}, %{current_user: user})

      assert found["id"] == service.id
      assert found["name"] == "test"
      assert found["namespace"] == "test"
    end

    test "it can fetch alerts for a service" do
      user = admin_user()
      cluster = insert(:cluster, handle: "test")
      repository = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}]
      ])

      alerts = insert_list(3, :alert, service: service)

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query Service($cluster: String!, $name: String!) {
          serviceDeployment(cluster: $cluster, name: $name) {
            id
            name
            namespace
            alerts(first: 5) { edges { node { id } } }
          }
        }
      """, %{"cluster" => "test", "name" => "test"}, %{current_user: user})

      assert found["id"] == service.id
      assert found["name"] == "test"
      assert found["namespace"] == "test"
      assert from_connection(found["alerts"])
             |> ids_equal(alerts)
    end

    test "clusters can fetch a services configuration and revisions" do
      user = admin_user()
      cluster = insert(:cluster)
      repository = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}]
      ])
      components = insert_list(3, :service_component, service: service)

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query Service($id: ID!) {
          serviceDeployment(id: $id) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
            revisions(first: 5) { edges { node { id } } }
            components { id group synced state}
          }
        }
      """, %{"id" => service.id}, %{cluster: cluster})

      assert found["name"] == "test"
      assert found["namespace"] == "test"
      assert found["git"]["ref"] == "master"
      assert found["git"]["folder"] == "k8s"
      [conf] = found["configuration"]
      assert conf["name"] == "name"
      assert conf["value"] == "value"

      [revision] = from_connection(found["revisions"])
      assert revision["id"] == service.revision_id

      assert ids_equal(found["components"], components)
      assert Enum.all?(found["components"], & &1["synced"])
      assert Enum.all?(found["components"], & &1["group"] == "networking.k8s.io")
      assert Enum.all?(found["components"], & &1["state"] == "RUNNING")
    end

    test "it can fetch helm values with rbac protection" do
      user = admin_user()
      reader = insert(:user)
      cluster = insert(:cluster)
      repository = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        helm: %{values: "secret: value"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}],
        read_bindings: [%{user_id: reader.id}]
      ])

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query Service($id: ID!) {
          serviceDeployment(id: $id) {
            name
            namespace
            git { ref folder }
            helm { values }
            repository { id }
          }
        }
      """, %{"id" => service.id}, %{current_user: user})

      assert found["helm"]["values"] == "secret: value"

      {:ok, %{data: %{"serviceDeployment" => found}, errors: [_ | _]}} = run_query("""
        query Service($id: ID!) {
          serviceDeployment(id: $id) {
            name
            namespace
            git { ref folder }
            helm { values }
            repository { id }
          }
        }
      """, %{"id" => service.id}, %{current_user: reader})

      refute found["helm"]["values"]
    end

    test "it can fetch service component node metrics" do
      user = admin_user()
      service = insert(:service)
      component = insert(:service_component,
        service: service,
        group: "apps",
        version: "v1",
        kind: "Deployment",
        namespace: "ns",
        name: "name"
      )
      deployment_settings(prometheus_connection: %{url: "example.com"})

      expect(HTTPoison, :post, 4, fn _, _, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
          %{values: [[1, "1"]]}
        ]}})}}
      end)


      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query serviceDeployment($id: ID!, $componentId: ID!) {
          serviceDeployment(id: $id) {
            id
            componentMetrics(componentId: $componentId) {
              cpu { values { timestamp value } }
            }
          }
        }
      """, %{"id" => service.id, "componentId" => component.id}, %{current_user: user})

      assert found["id"] == service.id
      refute Enum.empty?(found["componentMetrics"]["cpu"])
    end

    test "it can fetch a service heat map" do
      user = admin_user()
      service = insert(:service)
      deployment_settings(prometheus_connection: %{url: "example.com"})

      expect(HTTPoison, :post, 2, fn _, _, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
          %{value: [1, "1"]}
        ]}})}}
      end)

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query serviceDeployment($id: ID!) {
          serviceDeployment(id: $id) {
            id
            heatMap {
              cpu { value { timestamp value } }
              memory { value { timestamp value } }
            }
          }
        }
      """, %{"id" => service.id}, %{current_user: user})

      assert found["id"] == service.id
      refute Enum.empty?(found["heatMap"]["cpu"])
      refute Enum.empty?(found["heatMap"]["memory"])
    end

    test "it respects rbac" do
      user = insert(:user)
      service = insert(:service, read_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query serviceDeployment($id: ID!) {
          serviceDeployment(id: $id) {
            id
            editable
          }
        }
      """, %{"id" => service.id}, %{current_user: user})

      assert found["id"] == service.id
      refute found["editable"]

      {:ok, %{errors: [_ | _]}} = run_query("""
        query serviceDeployment($id: ID!) {
          serviceDeployment(id: $id) { id }
        }
      """, %{"id" => service.id}, %{current_user: insert(:user)})
    end

    test "it can sideload logs for a service" do
      user = insert(:user)
      service = insert(:service, read_bindings: [%{user_id: user.id}])
      deployment_settings(loki_connection: %{host: "https://loki", user: "user", password: "pwd"})

      expect(HTTPoison, :get, fn _, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
          %{stream: %{"var" => "val"}, values: [["1", "hello"]]},
          %{stream: %{"var" => "val2"}, values: [["1", "world"]]}
        ]}}
      )}}
      end)

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query serviceDeployment($id: ID!, $loki: LokiQuery!) {
          serviceDeployment(id: $id) {
            id
            logs(query: $loki, limit: 50) {
              values { timestamp value }
            }
          }
        }
      """, %{"id" => service.id, "loki" => %{"labels" => [], "filter" => %{"text" => "something"}}}, %{current_user: user})

      assert Enum.flat_map(found["logs"], &Enum.map(&1["values"], fn v -> v["value"] end)) == ["hello", "world"]
    end
  end

  describe "clusterServices" do
    test "it can fetch the services for a cluster" do
      cluster = insert(:cluster)
      services = insert_list(3, :service, cluster: cluster)
      insert_list(3, :service)

      {:ok, %{data: %{"clusterServices" => svcs}}} = run_query("""
        query {
          clusterServices { id tarball }
        }
      """, %{}, %{cluster: cluster})

      assert ids_equal(svcs, services)
      assert Enum.all?(svcs, & &1["tarball"])
    end
  end

  describe "pagedClusterServices" do
    test "it can fetch the services for a cluster" do
      cluster = insert(:cluster)
      services = insert_list(3, :service, cluster: cluster)
      insert_list(3, :service)

      {:ok, %{data: %{"pagedClusterServices" => found}}} = run_query("""
        query {
          pagedClusterServices(first: 5) {
            edges {
              node { id tarball }
            }
          }
        }
      """, %{}, %{cluster: cluster})

      svcs = from_connection(found)
      assert ids_equal(svcs, services)
      assert Enum.all?(svcs, & &1["tarball"])
    end
  end

  describe "serviceStatuses" do
    test "it can list the statuses counts for a service query" do
      cluster = insert(:cluster)
      insert_list(3, :service, cluster: cluster, status: :stale)
      insert_list(2, :service, cluster: cluster, status: :healthy)

      {:ok, %{data: %{"serviceStatuses" => statuses}}} = run_query("""
        query statuses($cluster: ID!) {
          serviceStatuses(clusterId: $cluster) { status count }
        }
      """, %{"cluster" => cluster.id}, %{current_user: admin_user()})

      statuses = Map.new(statuses, & {&1["status"], &1["count"]})
      assert statuses["STALE"] == 3
      assert statuses["HEALTHY"] == 2
    end
  end

  describe "globalServices" do
    test "it can list global services in the system" do
      globals = insert_list(3, :global_service)

      {:ok, %{data: %{"globalServices" => found}}} = run_query("""
        query {
          globalServices(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(globals)
    end
  end

  describe "requestManifests" do
    test "admins can request manifests" do
      service = insert(:service)

      {:ok, %{data: %{"requestManifests" => found}}} = run_query("""
        query Request($id: ID!) {
          requestManifests(id: $id) { id }
        }
      """, %{"id" => service.id}, %{current_user: admin_user()})


      assert found["id"] == service.id
    end

    test "non-admins cannot request manifests" do
      service = insert(:service)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Request($id: ID!) {
          requestManifests(id: $id) { id }
        }
      """, %{"id" => service.id}, %{current_user: insert(:user)})
    end
  end

  describe "fetchManifests" do
    @tag :skip
    test "admins can fetch manifests" do
      service = insert(:service)
      Console.Deployments.Services.save_manifests(["testing"], service.id, service.cluster)

      {:ok, %{data: %{"fetchManifests" => ["testing"]}}} = run_query("""
        query Fetch($id: ID!) {
          fetchManifests(id: $id)
        }
      """, %{"id" => service.id}, %{current_user: admin_user()})
    end

    test "non-admins cannot request manifests" do
      service = insert(:service)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Request($id: ID!) {
          fetchManifests(id: $id)
        }
      """, %{"id" => service.id}, %{current_user: insert(:user)})
    end
  end
end
