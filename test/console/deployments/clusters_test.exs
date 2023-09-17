defmodule Console.Deployments.ClustersTest do
  use Console.DataCase, async: true
  alias Console.Deployments.{Clusters, Services}

  describe "#create_cluster/2" do
    test "it can create a new cluster record" do
      user = admin_user()
      provider = insert(:cluster_provider)
      self = insert(:cluster, self: true)
      git = insert(:git_repository, url: "https://github.com/pluralsh/deploy-operator.git")

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

      {:ok, %{"version" => vsn, "node-pools" => pools, "cluster-name" => name}} = Services.configuration(svc)
      assert name == cluster.name
      assert vsn == cluster.version
      [node_pool] = Jason.decode!(pools)
      assert node_pool["name"] == pool.name
      assert node_pool["min_size"] == pool.min_size
      assert node_pool["max_size"] == pool.max_size
      assert node_pool["instance_type"] == "t5.large"

      [svc] = Clusters.services(cluster)

      assert svc.repository_id == git.id
      assert svc.git.ref == "main"
      assert svc.git.folder == "helm"

      {:ok, %{"deploy-token" => token, "url" => url}} = Services.configuration(svc)
      assert token == cluster.deploy_token
      assert url == Console.conf(:url)
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
      insert(:git_repository, url: "https://github.com/pluralsh/deploy-operator.git")

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

      [pool] = cluster.node_pools
      assert pool.min_size == 2
      %{service: svc} = Console.Repo.preload(cluster, [:service])

      {:ok, %{"version" => vsn, "node-pools" => pools, "cluster-name" => name}} = Services.configuration(svc)
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
      assert secrets["access-key-id"] == "aid"
      assert secrets["secret-access-key"] == "sak"

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
      assert secrets["access-key-id"] == "aid2"
      assert secrets["secret-access-key"] == "sak2"

      {:error, _} = Clusters.update_provider(%{
        cloud_settings: %{aws: %{access_key_id: "aid2", secret_access_key: "sak2"}}
      }, provider.id, insert(:user))
    end
  end
end
