defmodule Console.Deployments.ClustersTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.Deployments.{Clusters, Services}

  describe "#create_cluster/2" do
    test "it can create a new cluster record" do
      user = admin_user()
      provider = insert(:cluster_provider)
      self = insert(:cluster, self: true)
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      assert cluster.name == "test"
      assert cluster.version == "1.25"
      assert cluster.provider_id == provider.id
      assert cluster.deploy_token

      assert_receive {:event, %PubSub.ClusterCreated{item: ^cluster}}

      [pool] = cluster.node_pools
      assert pool.name == "pool"
      assert pool.min_size == 1
      assert pool.max_size == 5
      assert pool.instance_type == "t5.large"

      %{service: svc} = Console.Repo.preload(cluster, [:service])
      assert svc.repository_id == provider.repository_id
      assert svc.name == "cluster-#{cluster.name}"
      assert svc.namespace == provider.namespace
      assert svc.cluster_id == self.id

      {:ok, secrets} = Services.configuration(svc)
      assert secrets["clusterName"] == cluster.name
      assert secrets["version"] == cluster.version
      assert secrets["operatorNamespace"] == "plrl-deploy-operator"
      assert secrets["consoleUrl"] == Path.join(Console.conf(:ext_url), "ext/gql")
      assert secrets["deployToken"] == cluster.deploy_token
      assert secrets["clusterId"] == cluster.id
      [node_pool] = Jason.decode!(secrets["nodePools"])
      assert node_pool["name"] == pool.name
      assert node_pool["min_size"] == pool.min_size
      assert node_pool["max_size"] == pool.max_size
      assert node_pool["instance_type"] == "t5.large"

      [svc] = Clusters.services(cluster)

      assert svc.repository_id == git.id
      assert svc.git.ref == "main"
      assert svc.git.folder == "helm"

      {:ok, %{"deployToken" => token, "url" => url} = secrets} = Services.configuration(svc)
      assert token == cluster.deploy_token
      assert url == Path.join(Console.conf(:ext_url), "ext/gql")
      assert secrets["clusterId"] == cluster.id
    end

    test "it will respect rbac" do
      user = insert(:user)
      deployment_settings(create_bindings: [%{user_id: user.id}])
      provider = insert(:cluster_provider)
      insert(:cluster, self: true)

      {:ok, _} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      {:error, _} = Clusters.create_cluster(%{
        name: "another-test",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, insert(:user))
    end
  end

  describe "#update_cluster/2" do
    test "it can create a new cluster record" do
      user = admin_user()
      provider = insert(:cluster_provider)
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      {:ok, cluster} = Clusters.update_cluster(%{
        version: "1.25",
        node_pools: [
          %{name: "pool", min_size: 2, max_size: 5, instance_type: "t5.large"}
        ]
      }, cluster.id, user)

      assert_receive {:event, %PubSub.ClusterUpdated{item: ^cluster}}

      [pool] = cluster.node_pools
      assert pool.min_size == 2
      %{service: svc} = Console.Repo.preload(cluster, [:service])

      {:ok, %{"version" => vsn, "nodePools" => pools, "clusterName" => name}} = Services.configuration(svc)
      assert name == cluster.name
      assert vsn == cluster.version
      [node_pool] = Jason.decode!(pools)
      assert node_pool["name"] == pool.name
      assert node_pool["min_size"] == pool.min_size
      assert node_pool["max_size"] == pool.max_size
      assert node_pool["instance_type"] == "t5.large"

      {:error, _} = Clusters.update_cluster(%{
        version: "1.25",
        node_pools: [
          %{name: "pool", min_size: 2, max_size: 5, instance_type: "t5.large"}
        ]
      }, cluster.id, insert(:user))
    end
  end

  describe "#rotate_deploy_token/1" do
    test "it will add a new deploy token for the cluster" do
      user = admin_user()
      bot("console")
      provider = insert(:cluster_provider)
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      {:ok, updated} = Clusters.rotate_deploy_token(cluster)

      refute updated.deploy_token == cluster.deploy_token
      assert Clusters.get_by_deploy_token(cluster.deploy_token).id == cluster.id

      [svc] = Clusters.services(updated)
      {:ok, secrets} = Services.configuration(svc)
      assert secrets["deployToken"] == updated.deploy_token

      assert_receive {:event, %PubSub.ServiceUpdated{}}
    end
  end

  describe "#delete_cluster/2" do
    test "users can delete clusters if they have write permissions" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, deleted} = Clusters.delete_cluster(cluster.id, user)

      assert deleted.id == cluster.id
      assert deleted.deleted_at

      assert_receive {:event, %PubSub.ClusterDeleted{item: ^deleted}}
    end

    test "it will prevent management cluster deletion" do
      user = insert(:user)
      cluster = insert(:cluster, self: true, write_bindings: [%{user_id: user.id}])

      {:error, _} = Clusters.delete_cluster(cluster.id, user)
    end
  end

  describe "#create_provider/2" do
    test "it will create a new capi provider deployment" do
      user = insert(:user)
      self = insert(:cluster, self: true)
      settings = deployment_settings(write_bindings: [%{user_id: user.id}])

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      assert provider.name == "aws-sandbox"
      assert provider.namespace == "plrl-capi-aws-sandbox"
      assert provider.repository_id == settings.artifact_repository_id
      assert provider.git.folder == "capi/clusters/aws"
      assert provider.git.ref == "main"

      %{service: svc} = Console.Repo.preload(provider, [:service])
      assert svc.repository_id == settings.artifact_repository_id
      assert svc.name == "capi-#{provider.name}"
      assert svc.git.folder == "capi/providers/aws"
      assert svc.git.ref == "main"
      assert svc.namespace == provider.namespace
      assert svc.cluster_id == self.id

      {:ok, secrets} = Services.configuration(svc)
      assert secrets["accessKeyId"] == "aid"
      assert secrets["secretAccessKey"] == "sak"

      assert_receive {:event, %PubSub.ProviderCreated{item: ^provider}}

      {:error, _} = Clusters.create_provider(%{
        name: "aws-sandbox-two",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, insert(:user))
    end
  end

  describe "#update_provider/3" do
    test "it can update a cluster provider" do
      user = insert(:user)
      insert(:cluster, self: true)
      deployment_settings(write_bindings: [%{user_id: user.id}])

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      {:ok, updated} = Clusters.update_provider(%{
        cloud_settings: %{aws: %{access_key_id: "aid2", secret_access_key: "sak2"}}
      }, provider.id, user)

      %{service: svc} = Console.Repo.preload(updated, [:service])
      {:ok, secrets} = Services.configuration(svc)
      assert secrets["accessKeyId"] == "aid2"
      assert secrets["secretAccessKey"] == "sak2"

      assert_receive {:event, %PubSub.ProviderUpdated{item: ^updated}}

      {:error, _} = Clusters.update_provider(%{
        cloud_settings: %{aws: %{access_key_id: "aid2", secret_access_key: "sak2"}}
      }, provider.id, insert(:user))
    end
  end
end
