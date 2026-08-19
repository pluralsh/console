defmodule Console.AI.PubSub.Vector.EnabledTest do
  use Console.DataCase, async: false

  alias Console.AI.Vector.Enabled

  describe "enabled?/1" do
    test "keeps vectorization enabled for resources without an opt-out" do
      assert Enabled.enabled?(%{})
      assert Enabled.enabled?(insert(:project, disable_insights: false))
      assert Enabled.enabled?(insert(:project, disable_insights: nil))
    end

    test "disables vectorization for opted-out projects and their stacks" do
      project = insert(:project, disable_insights: true)
      stack = insert(:stack, project: project)

      refute Enabled.enabled?(project)
      refute Enabled.enabled?(stack)
    end

    test "requires both an enabled cluster and project for services" do
      enabled_project = insert(:project)
      disabled_project = insert(:project, disable_insights: true)
      enabled_cluster = insert(:cluster, project: enabled_project)
      disabled_cluster = insert(:cluster, project: enabled_project, disable_ai: true)
      project_disabled_cluster = insert(:cluster, project: disabled_project)

      assert Enabled.enabled?(enabled_cluster)
      assert Enabled.enabled?(insert(:service, cluster: enabled_cluster))
      refute Enabled.enabled?(disabled_cluster)
      refute Enabled.enabled?(insert(:service, cluster: disabled_cluster))
      refute Enabled.enabled?(project_disabled_cluster)
      refute Enabled.enabled?(insert(:service, cluster: project_disabled_cluster))
    end
  end
end
