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

    test "it can ship insight components" do
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
      """, %{"ping" => %{
        "currentVersion" => "1.24.2",
        "insightComponents" => [%{"group" => "apps", "version" => "v1", "kind" => "Deployment", "name" => "test"}]
      }}, %{cluster: cluster})

      assert pinged["id"] == cluster.id
      assert pinged["currentVersion"] == "1.24.2"
      assert pinged["version"] == "1.24.2"
      assert pinged["pingedAt"]
      assert pinged["installed"]

      %{insight_components: [_]} = Console.Repo.preload(cluster, [:insight_components])
    end
  end

  describe "registerRuntimeServices" do
    @tag :skip
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

    @tag :skip
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

  describe "upsertVirtualCluster" do
    test "it can upsert a new virtual cluster" do
      cluster = insert(:cluster)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")


      {:ok, %{data: %{"upsertVirtualCluster" => virt}}} = run_query("""
        mutation Upsert($attrs: ClusterAttributes!, $parentId: ID!) {
          upsertVirtualCluster(parentId: $parentId, attributes: $attrs) {
            id
            handle
            virtual
            deployToken
            parentCluster { id }
          }
        }
      """, %{
        "attrs" => %{
          "name" => "new-cluster"
        },
        "parentId" => cluster.id
      }, %{current_user: admin_user()})

      assert virt["handle"] == "new-cluster"
      assert virt["virtual"]
      assert virt["deployToken"]
      assert virt["parentCluster"]["id"] == cluster.id
    end
  end

  describe "deleteVirtualCluster" do
    test "it can delete a virtual cluster" do
      cluster = insert(:cluster, virtual: true)

      {:ok, %{data: %{"deleteVirtualCluster" => virt}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteVirtualCluster(id: $id) {
            id
            handle
            virtual
          }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})

      assert virt["id"] == cluster.id

      refute refetch(cluster)
    end

    test "it cannot delete non-virtual clusters" do
      cluster = insert(:cluster)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Delete($id: ID!) {
          deleteVirtualCluster(id: $id) {
            id
            handle
            virtual
          }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})
    end
  end

  describe "createClusterProvider" do
    test "it can create a new provider" do
      user = insert(:user)
      deployment_settings(create_bindings: [%{user_id: user.id}])
      insert(:cluster, self: true)

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
      deployment_settings(write_bindings: [%{user_id: user.id}])
      insert(:cluster, self: true)

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
      deployment_settings(write_bindings: [%{user_id: user.id}])
      insert(:cluster, self: true)

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
      deployment_settings(write_bindings: [%{user_id: user.id}])
      insert(:cluster, self: true)

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
      deployment_settings(write_bindings: [%{user_id: user.id}])
      insert(:cluster, self: true)
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
            name
            displayName
            group
            version
            kind
          }
        }
      """, %{"attrs" => %{
        "name" => "crd",
        "kind" => "ConstraintTemplate",
        "group" => "gatekeeper.sh",
        "version" => "v1beta1",
        "namespaced" => false,
        "displayName" => "Constraint Templates",
      }}, %{current_user: admin_user()})

      assert pinned["name"] == "crd"
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

  describe "saveUpgradeInsights" do
    test "it can persist upgrade insights for a cluster" do
      cluster = insert(:cluster)

      {:ok, %{data: %{"saveUpgradeInsights" => [_ | _]}}} = run_query("""
        mutation Insights($insights: [UpgradeInsightAttributes], $addons: [CloudAddonAttributes!]) {
          saveUpgradeInsights(insights: $insights, addons: $addons) { id }
        }
      """, %{
        "insights" => [%{
          "name" => "some deprecated api",
          "status" => "PASSING",
          "description" => "blah",
          "version" => "1.29",
          "details" => [%{
            "status" => "PASSING",
            "used" => "/apis/networking.k8s.io/v1beta1/ingress",
            "replacement" => "/apis/networking.k8s.io/v1/ingress",
            "replacedIn" => "1.25",
            "removedIn" => "1.28"
          }]
        }],
        "addons" => [%{"distro" => "EKS", "name" => "coredns", "version" => "1.29"}]
      }, %{cluster: cluster})

      {:ok, %{data: %{"saveUpgradeInsights" => [_ | _]}}} = run_query("""
        mutation Insights($insights: [UpgradeInsightAttributes], $addons: [CloudAddonAttributes!]) {
          saveUpgradeInsights(insights: $insights, addons: $addons) { id }
        }
      """, %{
        "insights" => [%{
          "name" => "some deprecated api",
          "status" => "PASSING",
          "description" => "blah",
          "version" => "1.29",
          "details" => [%{
            "status" => "PASSING",
            "used" => "/apis/networking.k8s.io/v1beta1/ingress",
            "replacement" => "/apis/networking.k8s.io/v1/ingress",
            "replacedIn" => "1.25",
            "removedIn" => "1.28"
          }]
        }],
        "addons" => [%{"distro" => "EKS", "name" => "coredns", "version" => "1.29"}]
      }, %{cluster: cluster})

      %{upgrade_insights: [%{details: [_]}], cloud_addons: [addon]} =
        Console.Repo.preload(cluster, [:cloud_addons, upgrade_insights: :details], force: true)

      assert addon.name == "coredns"
      assert addon.version == "1.29"
      assert addon.distro == :eks

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query Cluster($id: ID!) {
          cluster(id: $id) {
            upgradeInsights {
              name
              details { status }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})

      %{"upgradeInsights" => [%{"name" => _, "details" => [%{"status" => "PASSING"}]}]} = found
    end
  end

  describe "addClusterAuditLog" do
    test "it enqueues an audit log" do
      cluster = insert(:cluster)

      {:ok, %{data: %{"addClusterAuditLog" => true}}} = run_query("""
        mutation Add($audit: ClusterAuditAttributes!) {
          addClusterAuditLog(audit: $audit)
        }
      """, %{"audit" => %{
        "clusterId" => cluster.id,
        "method" => "GET",
        "path" => "/api/v1/namespaces"
      }}, %{current_user: insert(:user)})
    end
  end

  describe "ingestClusterCost" do
    test "it can ingest cluster cost information in one transaction" do
      cluster = insert(:cluster)
      deployment_settings(cost: %{recommendation_cushion: 10})
      cost = %{"cpu" => 1.0, "memory" => 100.0, "gpu" => 0.0, "cpuUtil" => 0.5, "memoryUtil" => 20.0, "gpuUtil" => 0.0}
      ingest = %{
        "cluster" => cost,
        "namespaces" => Enum.map([cost], &Map.put(&1, "namespace", "default")),
        "recommendations" => [
          %{
            "type" => "DEPLOYMENT",
            "namespace" => "default",
            "name" => "default",
            "container" => "nginx",
            "memoryUtil" => 10.0,
            "cpuUtil" => 10.0
          }
        ]
      }

      {:ok, %{data: %{"ingestClusterCost" => true}}} = run_query("""
        mutation Ingest($costs: CostIngestAttributes!) {
          ingestClusterCost(costs: $costs)
        }
      """, %{"costs" => ingest}, %{cluster: cluster})

      {:ok, %{data: %{"ingestClusterCost" => true}}} = run_query("""
        mutation Ingest($costs: CostIngestAttributes!) {
          ingestClusterCost(costs: $costs)
        }
      """, %{"costs" => ingest}, %{cluster: cluster})

      [usage] = Console.Repo.all(Console.Schema.ClusterUsage)
      assert usage.cluster_id == cluster.id

      [ns] = Console.Repo.all(Console.Schema.ClusterNamespaceUsage)
      assert ns.cluster_id == cluster.id

      [sr] = Console.Repo.all(Console.Schema.ClusterScalingRecommendation)
      assert sr.cluster_id == cluster.id
    end
  end

  describe "createClusterRegistration" do
    test "can create a new registration" do
      user = bootstrap_user()

      {:ok, %{data: %{"createClusterRegistration" => reg}}} = run_query("""
        mutation Create($attrs: ClusterRegistrationCreateAttributes!) {
          createClusterRegistration(attributes: $attrs) {
            id
            machineId
            project { id }
          }
        }
      """, %{"attrs" => %{"machineId" => "blah"}}, %{current_user: user})

      assert reg["id"]
      assert reg["machineId"] == "blah"
      assert reg["project"]["id"] == user.bootstrap.project_id
    end
  end

  describe "updateClusterRegistration" do
    test "can update a new registration" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      reg  = insert(:cluster_registration, project: project)

      {:ok, %{data: %{"updateClusterRegistration" => upd}}} = run_query("""
        mutation Update($id: ID!, $attrs: ClusterRegistrationUpdateAttributes!) {
          updateClusterRegistration(id: $id, attributes: $attrs) {
            id
            name
            handle
          }
        }
      """, %{"attrs" => %{"name" => "edge-1"}, "id" => reg.id}, %{current_user: user})

      assert upd["id"]     == reg.id
      assert upd["name"]   == "edge-1"
      assert upd["handle"] == "edge-1"
    end
  end

  describe "deleteClusterRegistration" do
    test "can delete a new registration" do
      user    = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      reg     = insert(:cluster_registration, project: project, name: "edge-1", handle: "edge-1")

      {:ok, %{data: %{"deleteClusterRegistration" => del}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteClusterRegistration(id: $id) {
            id
            name
            handle
          }
        }
      """, %{"id" => reg.id}, %{current_user: user})

      assert del["id"] == reg.id
      refute refetch(reg)
    end
  end
end
