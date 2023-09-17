defmodule Console.GraphQl.DeploymentMutationsTest do
  use Console.DataCase, async: true

  describe "createGitRepository" do
    test "it will create a new git repo" do
      {:ok, %{data: %{"createGitRepository" => git}}} = run_query("""
        mutation Create($attrs: GitRepositoryAttributes!) {
          createGitRepository(attributes: $attrs) {
            id
            url
          }
        }
      """, %{"attrs" => %{"url" => "https://github.com/pluralsh/console.git"}}, %{current_user: admin_user()})

      assert git["url"] == "https://github.com/pluralsh/console.git"
    end
  end

  describe "createCluster" do
    test "it will create a new cluster" do
      user = insert(:user)
      provider = insert(:cluster_provider)

      {:ok, %{data: %{"createCluster" => cluster}}} = run_query("""
        mutation Create($attributes: ClusterAttributes!) {
          createCluster(attributes: $attributes) {
            name
            version
            provider { name }
            nodePools { id name minSize maxSize instanceType }
          }
        }
      """, %{"attributes" => %{
        "name" => "test",
        "providerId" => provider.id,
        "version" => "1.25",
        "nodePools" => [%{"name" => "pool", "minSize" => 1, "maxSize" => 10, "instanceType" => "t5.large"}]
      }}, %{current_user: user})

      assert cluster["name"] == "test"
      assert cluster["provider"]["name"] == provider.name
      assert cluster["version"] == "1.25"

      [node_pool] = cluster["nodePools"]

      assert node_pool["name"] == "pool"
      assert node_pool["minSize"] == 1
      assert node_pool["maxSize"] == 10
      assert node_pool["instanceType"] == "t5.large"
    end
  end

  describe "createService" do
    test "it can create a new service" do
      cluster = insert(:cluster)
      user = admin_user()
      git = insert(:git_repository)

      {:ok, %{data: %{"createServiceDeployment" => service}}} = run_query("""
        mutation Create($clusterId: ID!, $attributes: ServiceDeploymentAttributes!) {
          createServiceDeployment(clusterId: $clusterId, attributes: $attributes) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
          }
        }
      """, %{
        "attributes" => %{
          "name" => "test",
          "namespace" => "test",
          "git" => %{"ref" => "master", "folder" => "k8s"},
          "repositoryId" => git.id,
          "configuration" => [%{"name" => "name", "value" => "value"}],
        },
        "clusterId" => cluster.id,
      }, %{current_user: user})

      assert service["name"] == "test"
      assert service["namespace"] == "test"
      assert service["git"]["ref"] == "master"
      assert service["git"]["folder"] == "k8s"
      assert service["repository"]["id"] == git.id

      [conf] = service["configuration"]
      assert conf["name"] == "name"
      assert conf["value"] == "value"
    end
  end

  describe "updateServiceDeployment" do
    test "updates the service" do
      cluster = insert(:cluster)
      user = admin_user()
      git = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git_ref: %{ref: "master", folder: "k8s"},
        repository_id: git.id,
        configuration: [%{name: "name", value: "value"}]
      ])

      {:ok, %{data: %{"updateServiceDeployment" => updated}}} = run_query("""
        mutation update($id: ID!, $attributes: ServiceUpdateAttributes!) {
          updateServiceDeployment(id: $id, attributes: $attributes) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
          }
        }
      """, %{
        "attributes" => %{
          "git" => %{"ref" => "main", "folder" => "k8s"},
          "configuration" => [%{"name" => "new-name", "value" => "new-value"}],
        },
        "id" => service.id,
      }, %{current_user: user})

      assert updated["git"]["ref"] == "main"
      assert updated["git"]["folder"] == "k8s"
      assert updated["repository"]["id"] == git.id

      [conf] = updated["configuration"]
      assert conf["name"] == "new-name"
      assert conf["value"] == "new-value"
    end
  end

  describe "updateServiceComponents" do
    test "it will post updates to the components of the service in a cluster" do
      cluster = insert(:cluster)
      service = insert(:service, cluster: cluster)
      attrs = %{
        "name" => "name",
        "namespace" => "namespace",
        "group" => "networking.k8s.io",
        "version" => "v1",
        "kind" => "ingress",
        "synced" => true,
        "state" => "RUNNING"
      }

      {:ok, %{data: %{"updateServiceComponents" => svc}}} = run_query("""
        mutation Update($components: [ServiceComponents], $id: ID!) {
          updateServiceComponents(id: $id, components: $components) {
            id
            components { name kind namespace group version kind synced state }
          }
        }
      """, %{"id" => service.id, "components" => [attrs]}, %{cluster: cluster})

      assert svc["id"] == service.id
      [component] = svc["components"]

      for {k, v} <- attrs,
        do: assert component[k] == v
    end
  end
end
