defmodule Console.Compliance.Datasource.ClusterCostsTest do
  use Console.DataCase, async: true
  alias Console.Compliance.Datasource.ClusterCosts

  describe "stream/0" do
    test "it returns a stream of cluster-level cost data" do
      project = insert(:project, name: "cost-project")
      cluster = insert(:cluster, handle: "cost-cluster", project: project)

      usage =
        insert(:cluster_usage, %{
          cluster: cluster,
          cpu_cost: 11.5,
          memory_cost: 22.25,
          gpu_cost: 33.75,
          node_cost: 44.5,
          control_plane_cost: 55.0,
          load_balancer_cost: 66.5,
          ingress_cost: 77.25,
          egress_cost: 88.75,
          storage_cost: 99.5
        })

      result =
        ClusterCosts.stream()
        |> Enum.find(&(&1.cluster == "cost-cluster"))

      assert result.cluster == "cost-cluster"
      assert result.project == "cost-project"
      assert result.cpu_cost == 11.5
      assert result.memory_cost == 22.25
      assert result.gpu_cost == 33.75
      assert result.node_cost == 44.5
      assert result.control_plane_cost == 55.0
      assert result.load_balancer_cost == 66.5
      assert result.ingress_cost == 77.25
      assert result.egress_cost == 88.75
      assert result.storage_cost == 99.5
      assert result.created_at == usage.inserted_at
      assert result.updated_at == usage.updated_at
    end
  end
end
