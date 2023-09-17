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
end
