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
  end

  describe "services" do
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
  end
end
