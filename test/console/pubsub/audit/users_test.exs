defmodule Console.PubSub.Audit.UsersTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.PubSub.Consumers.Audit

  describe "TemporaryTokenCreated" do
    test "It will create an audit log" do
      user  = insert(:user)

      event = %PubSub.TemporaryTokenCreated{item: user}
      {:ok, audit} = Audit.handle_event(event)

      assert audit.type == :temp_token
      assert audit.action == :create
      assert audit.actor_id == user.id
      assert audit.data.id == user.id
    end
  end
end
