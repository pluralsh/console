defmodule Console.Deployments.ClustersTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Clusters

  describe "#create_cluster/2" do
    test "it can create a new cluster record" do
      user = insert(:user)
      provider = insert(:cluster_provider)

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
    end
  end
end
