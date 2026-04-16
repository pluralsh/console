defmodule Console.AI.Tools.Workbench.Infrastructure.ClusterTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Workbench.Infrastructure.Cluster
  alias Console.Deployments.Clusters

  describe "simplified_upgrade_plan/1" do
    test "includes ingress-nginx current and fix versions with expected kube compatibility" do
      cluster = insert(:cluster, current_version: "1.32.4")
      insert(:runtime_service, cluster: cluster, name: "ingress-nginx", version: "1.12.0")

      %{blocking_addons: [full_blocker]} = Clusters.upgrade_plan(cluster)
      %{blocking_addons: [addon_plan]} = Cluster.simplified_upgrade_plan(cluster)

      assert full_blocker.current.version == "1.12.0"
      assert "1.32" in full_blocker.current.kube
      refute "1.33" in full_blocker.current.kube
      assert full_blocker.fix.version == "1.13.0"
      assert "1.33" in full_blocker.fix.kube
      assert "1.32" in full_blocker.fix.kube

      assert addon_plan.current.name == "ingress-nginx"
      assert addon_plan.current.version == "1.12.0"
      refute Enum.empty?(addon_plan.current.addon_details.kube)
      assert addon_plan.fix.version == "1.13.0"
    end
  end
end
