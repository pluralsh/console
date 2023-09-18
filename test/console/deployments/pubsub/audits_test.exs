defmodule Console.Deployments.PubSub.AuditsTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.PubSub.Consumers.Audit

  describe "ClusterCreated" do
    test "it will register a create audit" do
      cluster = insert(:cluster)
      user = insert(:user)

      event = %PubSub.ClusterCreated{item: cluster, actor: user}
      {:ok, audit} = Audit.handle_event(event)

      assert audit.type == :cluster
      assert audit.action == :create
      assert audit.actor_id == user.id
      assert audit.data.id == cluster.id
    end
  end
end
