defmodule Console.PubSub.Audit.BuildsTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.PubSub.Consumers.Audit

  describe "BuildCreated" do
    setup [:set_context]

    test "It will create an audit log", %{audit_context: ctx} do
      build = insert(:build)
      user  = insert(:user)

      event = %PubSub.BuildCreated{
        item: build,
        actor: user,
        context: Console.Services.Audits.context()
      }
      {:ok, audit} = Audit.handle_event(event)

      assert audit.type == :build
      assert audit.action == :create
      assert audit.actor_id == user.id
      assert audit.data.id == build.id

      assert audit.ip == ctx.ip
      assert audit.country == ctx.country
      assert audit.city == ctx.city
      assert audit.latitude == ctx.latitude
      assert audit.longitude == ctx.longitude
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

  def set_context(_) do
    ctx = %Console.Schema.AuditContext{
      ip: "1.2.3.4",
      country: "US",
      city: "New York",
      latitude: "13",
      longitude: "31"
    }
    Console.Services.Audits.set_context(ctx)

    [audit_context: ctx]
  end
end
