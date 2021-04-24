defmodule Console.PubSub.Audit.BuildsTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.PubSub.Consumers.Audit

  describe "BuildCreated" do
    test "It will create an audit log" do
      build = insert(:build)
      user  = insert(:user)

      event = %PubSub.BuildCreated{item: build, actor: user}
      {:ok, audit} = Audit.handle_event(event)

      assert audit.type == :build
      assert audit.action == :create
      assert audit.actor_id == user.id
      assert audit.data.id == build.id
    end
  end

  describe "BuildApproved" do
    test "It will create an audit log" do
      build = insert(:build)
      user  = insert(:user)

      event = %PubSub.BuildApproved{item: build, actor: user}
      {:ok, audit} = Audit.handle_event(event)

      assert audit.type == :build
      assert audit.action == :approve
      assert audit.actor_id == user.id
      assert audit.data.id == build.id
    end
  end

  describe "BuildCancelled" do
    test "It will create an audit log" do
      build = insert(:build)
      user  = insert(:user)

      event = %PubSub.BuildCancelled{item: build, actor: user}
      {:ok, audit} = Audit.handle_event(event)

      assert audit.type == :build
      assert audit.action == :cancel
      assert audit.actor_id == user.id
      assert audit.data.id == build.id
    end
  end
end
