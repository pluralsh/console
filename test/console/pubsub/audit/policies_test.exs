defmodule Console.PubSub.Audit.PoliciesTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.PubSub.Consumers.Audit

  describe "UpgradePolicyCreated" do
    test "It will create an audit log" do
      policy = insert(:upgrade_policy)
      user  = insert(:user)

      event = %PubSub.UpgradePolicyCreated{item: policy, actor: user}
      {:ok, audit} = Audit.handle_event(event)

      assert audit.type == :policy
      assert audit.action == :create
      assert audit.actor_id == user.id
      assert audit.data.id == policy.id
    end
  end

  describe "UpgradePolicyDeleted" do
    test "It will create an audit log" do
      policy = insert(:upgrade_policy)
      user  = insert(:user)

      event = %PubSub.UpgradePolicyDeleted{item: policy, actor: user}
      {:ok, audit} = Audit.handle_event(event)

      assert audit.type == :policy
      assert audit.action == :delete
      assert audit.actor_id == user.id
      assert audit.data.id == policy.id
    end
  end
end
