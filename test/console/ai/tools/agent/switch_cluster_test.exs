defmodule Console.AI.Tools.Agent.SwitchClusterTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Agent.SwitchCluster

  describe "implement/1" do
    test "it can switch to a cluster" do
      cluster = insert(:cluster)

      actor = admin_user()
      session = insert(:agent_session)
      Console.AI.Tool.context(user: actor, session: session, thread: session.thread)

      {:ok, result} = SwitchCluster.implement(%SwitchCluster{handle: cluster.handle})
      assert is_binary(result)

      assert refetch(session).cluster_id == cluster.id
    end

    test "non-readers cannot switch to a cluster" do
      cluster = insert(:cluster)

      actor = insert(:user)
      session = insert(:agent_session)
      Console.AI.Tool.context(user: actor, session: session, thread: session.thread)

      {:ok, result} = SwitchCluster.implement(%SwitchCluster{handle: cluster.handle})
      assert result =~ "failed to switch to cluster #{cluster.handle}"
    end
  end
end
