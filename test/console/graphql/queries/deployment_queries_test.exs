defmodule Console.GraphQl.DeploymentQueriesTest do
  use Console.DataCase, async: true

  describe "gitRepositories" do
    test "it can list git repositories" do
      repos = insert_list(3, :git_repository)

      {:ok, %{data: %{"gitRepositories" => found}}} = run_query("""
        query {
          gitRepositories(first: 5) {
            edges { node { id url } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(repos)
      assert from_connection(found)
             |> Enum.all?(& &1["url"])
    end
  end

  describe "clusters" do
    test "it can list clusters in the system" do
      clusters = insert_list(3, :cluster)

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query {
          clusters(first: 5) {
            edges { node { id name } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, clusters)
      assert Enum.all?(found, & &1["name"])
    end

    test "it will respect rbac" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      clusters = insert_list(3, :cluster, read_bindings: [%{group_id: group.id}])
      other = insert(:cluster, write_bindings: [%{user_id: user.id}])
      insert_list(3, :cluster)

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query {
          clusters(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([other | clusters])

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query {
          clusters(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found) == []
    end
  end

  describe "cluster" do
    test "it can fetch a cluster by id" do
      cluster = insert(:cluster)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { id }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})

      assert found["id"] == cluster.id
    end

    test "writers can query deploy tokens" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { deployToken }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["deployToken"] == cluster.deploy_token
    end

    test "non writers cannot query deploy tokens" do
      cluster = insert(:cluster)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { deployToken }
        }
      """, %{"id" => cluster.id}, %{current_user: insert(:user)})
    end

    test "it can fetch by deploy token" do
      cluster = insert(:cluster)
      revision = insert(:cluster_revision, cluster: cluster)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query {
          cluster {
            id
            revisions(first: 5) { edges { node { id } } }
          }
        }
      """, %{"id" => cluster.id}, %{cluster: cluster})

      assert found["id"] == cluster.id
      assert from_connection(found["revisions"])
             |> ids_equal([revision])
    end

    test "it respects rbac" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { id }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["id"] == cluster.id

      {:ok, %{errors: [_ | _]}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { id }
        }
      """, %{"id" => cluster.id}, %{current_user: insert(:user)})
    end
  end

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
  end

  describe "deploymentSettings" do
    test "users can fetch settings" do
      admin = insert(:user)
      settings = deployment_settings()

      {:ok, %{data: %{"deploymentSettings" => updated}}} = run_query("""
        query {
          deploymentSettings {
            id
            deployerRepository { id }
          }
        }
      """, %{}, %{current_user: admin})

      assert updated["id"] == settings.id
      assert updated["deployerRepository"]["id"] == settings.deployer_repository_id
    end
  end

  describe "clusterProviders" do
    test "it will list cluster providers" do
      user = admin_user()
      providers = insert_list(3, :cluster_provider, cloud: "aws")

      {:ok, %{data: %{"clusterProviders" => found}}} = run_query("""
        query {
          clusterProviders(first: 5) { edges { node { id supportedVersions } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(providers)
      refute from_connection(found)
             |> Enum.any?(&Enum.empty?(&1["supportedVersions"]))
    end

    test "it will respect rbac" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      providers = insert_list(3, :cluster_provider, write_bindings: [%{group_id: group.id}])
      other = insert(:cluster_provider, read_bindings: [%{user_id: user.id}])
      insert_list(3, :cluster_provider)

      {:ok, %{data: %{"clusterProviders" => found}}} = run_query("""
        query {
          clusterProviders(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([other | providers])

      {:ok, %{data: %{"clusterProviders" => found}}} = run_query("""
        query {
          clusterProviders(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found) == []
    end
  end

  describe "clusterProvider" do
    test "it can fetch a cluster provider by id" do
      admin = admin_user()
      provider = insert(:cluster_provider)

      {:ok, %{data: %{"clusterProvider" => updated}}} = run_query("""
        query provider($id: ID!) {
          clusterProvider(id: $id) { id }
        }
      """, %{"id" => provider.id}, %{current_user: admin})

      assert updated["id"] == provider.id
    end

    test "it respects rbac" do
      admin = insert(:user)
      provider = insert(:cluster_provider)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query provider($id: ID!) {
          clusterProvider(id: $id) { id }
        }
      """, %{"id" => provider.id}, %{current_user: admin})
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
end
