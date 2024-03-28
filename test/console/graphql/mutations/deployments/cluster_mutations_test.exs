defmodule Console.GraphQl.Deployments.ClusterMutationsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Deployments.Clusters

  describe "createCluster" do
    test "it will create a new cluster" do
      user = admin_user()
      provider = insert(:cluster_provider)
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      expect(Console.Features, :available?, fn :cd -> true end)

      {:ok, %{data: %{"createCluster" => cluster}}} = run_query("""
        mutation Create($attributes: ClusterAttributes!) {
          createCluster(attributes: $attributes) {
            name
            version
            deployToken
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
      assert cluster["deployToken"]

      [node_pool] = cluster["nodePools"]

      assert node_pool["name"] == "pool"
      assert node_pool["minSize"] == 1
      assert node_pool["maxSize"] == 10
      assert node_pool["instanceType"] == "t5.large"
    end
  end

  describe "updateCluster" do
    test "it can update a cluster" do
      user = admin_user()
      provider = insert(:cluster_provider)
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      expect(Console.Features, :available?, fn :cd -> true end)

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      {:ok, %{data: %{"updateCluster" => updated}}} = run_query("""
        mutation Create($id: ID!, $attributes: ClusterUpdateAttributes!) {
          updateCluster(id: $id, attributes: $attributes) {
            id
            version
            nodePools { id name minSize maxSize instanceType }
          }
        }
      """, %{"id" => cluster.id, "attributes" => %{
        "version" => "1.25",
        "nodePools" => [%{"name" => "pool", "minSize" => 2, "maxSize" => 10, "instanceType" => "t5.large"}]
      }}, %{current_user: user})

      assert updated["id"] == cluster.id
      assert updated["version"] == "1.25"
      [pool] = updated["nodePools"]
      assert pool["minSize"] == 2
    end
  end

  describe "pingCluster" do
    test "it can mark a cluster as pinged" do
      cluster = insert(:cluster, version: "1.24.1")

      {:ok, %{data: %{"pingCluster" => pinged}}} = run_query("""
        mutation Ping($ping: ClusterPing!) {
          pingCluster(attributes: $ping) {
            id
            pingedAt
            installed
            version
            currentVersion
          }
        }
      """, %{"ping" => %{"currentVersion" => "1.24.2"}}, %{cluster: cluster})

      assert pinged["id"] == cluster.id
      assert pinged["currentVersion"] == "1.24.2"
      assert pinged["version"] == "1.24.2"
      assert pinged["pingedAt"]
      assert pinged["installed"]
    end
  end

  describe "registerRuntimeServices" do
    test "it can upsert a set of runtime services" do
      cluster = insert(:cluster, version: "1.24")

      {:ok, %{data: %{"registerRuntimeServices" => 1}}} = run_query("""
        mutation CreateRuntime($services: [RuntimeServiceAttributes]) {
          registerRuntimeServices(services: $services)
        }
      """, %{"services" => [
        %{"name" => "ingress-nginx", "version" => "1.3.1"},
        %{"name" => "bogus", "version" => "0.0.0"}
      ]}, %{cluster: cluster})

      [runtime] = Clusters.runtime_services(cluster)
      assert runtime.name == "ingress-nginx"
      assert runtime.version == "1.3.1"
    end

    test "it can add a service id in the upsert" do
      cluster = insert(:cluster, version: "1.24")
      svc = insert(:service, cluster: cluster)
      {:ok, %{data: %{"registerRuntimeServices" => 1}}} = run_query("""
        mutation CreateRuntime($services: [RuntimeServiceAttributes], $serviceId: ID) {
          registerRuntimeServices(services: $services, serviceId: $serviceId)
        }
      """, %{"services" => [
        %{"name" => "ingress-nginx", "version" => "1.3.1"},
        %{"name" => "bogus", "version" => "0.0.0"}
      ], "serviceId" => svc.id}, %{cluster: cluster})

      [runtime] = Clusters.runtime_services(cluster)
      assert runtime.name == "ingress-nginx"
      assert runtime.version == "1.3.1"
      assert runtime.service_id == svc.id
    end
  end

  describe "deleteCluster" do
    test "it can mark a cluster for deletion" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"deleteCluster" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteCluster(id: $id) { id deletedAt }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert deleted["id"] == cluster.id
      assert deleted["deletedAt"]
    end
  end

  describe "detachCluster" do
    test "it can mark a cluster for deletion" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"detachCluster" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          detachCluster(id: $id) { id deletedAt }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert deleted["id"] == cluster.id
      refute refetch(cluster)
    end
  end

  describe "createClusterProvider" do
    test "it can create a new provider" do
      user = insert(:user)
      insert(:cluster, self: true)
      deployment_settings(create_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"createClusterProvider" => created}}} = run_query("""
        mutation create($attrs: ClusterProviderAttributes!) {
          createClusterProvider(attributes: $attrs) { id }
        }
      """, %{"attrs" => %{
        "name" => "aws-sandbox",
        "cloudSettings" => %{"aws" => %{"accessKeyId" => "aid", "secretAccessKey" => "sak"}}
      }}, %{current_user: user})

      assert created["id"]
    end
  end

  describe "updateClusterProvider" do
    test "it can update a cluster provider" do
      user = insert(:user)
      insert(:cluster, self: true)
      deployment_settings(write_bindings: [%{user_id: user.id}])

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      {:ok, %{data: %{"updateClusterProvider" => update}}} = run_query("""
        mutation create($id: ID!, $attrs: ClusterProviderUpdateAttributes!) {
          updateClusterProvider(id: $id, attributes: $attrs) { id }
        }
      """, %{"id" => provider.id, "attrs" => %{
        "cloudSettings" => %{"aws" => %{"accessKeyId" => "aid", "secretAccessKey" => "sak"}}
      }}, %{current_user: user})

      assert update["id"] == provider.id
    end
  end

  describe "deleteClusterProvider" do
    test "it can delete a given cluster provider" do
      user = insert(:user)
      insert(:cluster, self: true)
      deployment_settings(write_bindings: [%{user_id: user.id}])

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      {:ok, %{data: %{"deleteClusterProvider" => update}}} = run_query("""
        mutation create($id: ID!) {
          deleteClusterProvider(id: $id) {
            id
            deletedAt
          }
        }
      """, %{"id" => provider.id}, %{current_user: user})

      assert update["id"] == provider.id
      assert update["deletedAt"]
    end
  end


  describe "createProviderCredential" do
    test "it can create a new provider credential" do
      user = insert(:user)
      insert(:cluster, self: true)
      deployment_settings(write_bindings: [%{user_id: user.id}])

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      {:ok, %{data: %{"createProviderCredential" => cred}}} = run_query("""
        mutation Create($attributes: ProviderCredentialAttributes!, $name: String!) {
          createProviderCredential(name: $name, attributes: $attributes) {
            id
            name
            kind
          }
        }
      """, %{"attributes" => %{"name" => "test", "kind" => "AwsStaticIdentity"}, "name" => provider.name}, %{current_user: user})

      assert cred["name"] == "test"
      assert cred["kind"] == "AwsStaticIdentity"
    end
  end

  describe "deleteProviderCredential" do
    test "it can create a new provider credential" do
      user = insert(:user)
      insert(:cluster, self: true)
      deployment_settings(write_bindings: [%{user_id: user.id}])
      cred = insert(:provider_credential)

      {:ok, %{data: %{"deleteProviderCredential" => del}}} = run_query("""
        mutation Create($id: ID!) {
          deleteProviderCredential(id: $id) {
            id
          }
        }
      """, %{"id" => cred.id}, %{current_user: user})

      assert del["id"] == cred.id
      refute refetch(cred)
    end
  end

  describe "createPinnedCustomResource" do
    test "admins can create a pcr" do
      {:ok, %{data: %{"createPinnedCustomResource" => pinned}}} = run_query("""
        mutation Create($attrs: PinnedCustomResourceAttributes!) {
          createPinnedCustomResource(attributes: $attrs) {
            id
            displayName
            group
            version
            kind
          }
        }
      """, %{"attrs" => %{
        "kind" => "ConstraintTemplate",
        "group" => "gatekeeper.sh",
        "version" => "v1beta1",
        "namespaced" => false,
        "displayName" => "Constraint Templates",
      }}, %{current_user: admin_user()})

      assert pinned["kind"] == "ConstraintTemplate"
      assert pinned["group"] == "gatekeeper.sh"
      assert pinned["version"] == "v1beta1"
      assert pinned["displayName"] == "Constraint Templates"
      refute pinned["namespaced"]
    end
  end

  describe "deletePinnedCustomResource" do
    test "admins can delete pcrs" do
      pcr = insert(:pinned_custom_resource)
      {:ok, %{data: %{"deletePinnedCustomResource" => pinned}}} = run_query("""
        mutation Delete($id: ID!) {
          deletePinnedCustomResource(id: $id) { id }
        }
      """, %{"id" => pcr.id}, %{current_user: admin_user()})

      assert pinned["id"] == pcr.id
      refute refetch(pcr)
    end
  end
end
