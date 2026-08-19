defmodule Console.Schema.AiPollableTest do
  use Console.DataCase, async: true

  alias Console.Repo
  alias Console.Schema.{Cluster, Service, Stack}

  describe "Service.ai_pollable/1" do
    test "returns due services on healthy, AI-enabled clusters in insight-enabled projects" do
      enabled_project = insert(:project)
      disabled_project = insert(:project, disable_insights: true)
      cluster =
        insert(:cluster, project: enabled_project, pinged_at: DateTime.utc_now())

      due = insert(:service, cluster: cluster, ai_poll_at: DateTime.add(DateTime.utc_now(), -1, :hour))
      unpolled = insert(:service, cluster: cluster)
      insert(:service, cluster: cluster, ai_poll_at: DateTime.add(DateTime.utc_now(), 1, :hour))
      insert(:service, cluster: insert(:cluster, project: disabled_project, pinged_at: DateTime.utc_now()))
      insert(:service, cluster: insert(:cluster, project: enabled_project, disable_ai: true, pinged_at: DateTime.utc_now()))
      insert(:service, cluster: insert(:cluster, project: enabled_project))

      assert ids_equal(Repo.all(Service.ai_pollable()), [due, unpolled])
    end
  end

  describe "Stack.ai_pollable/1" do
    test "returns due stacks unless their project disables insights" do
      enabled_project = insert(:project)
      disabled_project = insert(:project, disable_insights: true)

      due = insert(:stack, project: enabled_project, ai_poll_at: DateTime.add(DateTime.utc_now(), -1, :hour))
      unpolled = insert(:stack, project: enabled_project)
      insert(:stack, project: enabled_project, ai_poll_at: DateTime.add(DateTime.utc_now(), 1, :hour))
      insert(:stack, project: disabled_project)

      assert ids_equal(Repo.all(Stack.ai_pollable()), [due, unpolled])
    end
  end

  describe "Cluster.ai_pollable/1" do
    test "returns due clusters unless their project disables insights" do
      enabled_project = insert(:project)
      disabled_project = insert(:project, disable_insights: true)

      due = insert(:cluster, project: enabled_project, ai_poll_at: DateTime.add(DateTime.utc_now(), -1, :hour))
      unpolled = insert(:cluster, project: enabled_project)
      insert(:cluster, project: enabled_project, ai_poll_at: DateTime.add(DateTime.utc_now(), 1, :hour))
      insert(:cluster, project: disabled_project)

      assert ids_equal(Repo.all(Cluster.ai_pollable()), [due, unpolled])
    end
  end
end
