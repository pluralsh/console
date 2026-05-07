defmodule Console.Compliance.Datasource.ClusterNamespaceCostsTest do
  use Console.DataCase, async: true
  alias Console.Compliance.Datasource.ClusterNamespaceCosts

  describe "stream/0" do
    test "it returns a stream of cluster namespace cost data" do
      project = insert(:project, name: "namespace-cost-project")
      cluster = insert(:cluster, handle: "namespace-cost-cluster", project: project)

      usage =
        insert(:cluster_namespace_usage, %{
          cluster: cluster,
          namespace: "payments",
          cpu_cost: 10.0,
          memory_cost: 20.5,
          gpu_cost: 30.25,
          load_balancer_cost: 40.75,
          ingress_cost: 50.5,
          egress_cost: 60.0,
          storage_cost: 70.25
        })

      result =
        ClusterNamespaceCosts.stream()
        |> Enum.find(&(&1.cluster == "namespace-cost-cluster" && &1.namespace == "payments"))

      assert result.cluster == "namespace-cost-cluster"
      assert result.project == "namespace-cost-project"
      assert result.namespace == "payments"
      assert result.cpu_cost == 10.0
      assert result.memory_cost == 20.5
      assert result.gpu_cost == 30.25
      assert result.load_balancer_cost == 40.75
      assert result.ingress_cost == 50.5
      assert result.egress_cost == 60.0
      assert result.storage_cost == 70.25
      assert result.created_at == usage.inserted_at
      assert result.updated_at == usage.updated_at
    end
  end
end
