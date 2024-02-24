defmodule Console.Deployments.NotificationsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Deployments.Notifications

  describe "#upsert_sink/2" do
    test "an admin can create a notif sink" do
      {:ok, sink} = Notifications.upsert_sink(%{
        name: "sink",
        type: :slack,
        configuration: %{slack: %{url: "some.url"}}
      }, admin_user())

      assert sink.name == "sink"
      assert sink.type == :slack
      assert sink.configuration.slack.url == "some.url"
    end

    test "it can update a notif sink" do
      sink = insert(:notification_sink, name: "sink")

      {:ok, up} = Notifications.upsert_sink(%{
        name: "sink",
        type: :slack,
        configuration: %{slack: %{url: "some.url"}}
      }, admin_user())

      assert up.id == sink.id
      assert up.name == "sink"
      assert up.type == :slack
      assert up.configuration.slack.url == "some.url"
    end

    test "non-admins cannot create sinks" do
      {:error, _} = Notifications.upsert_sink(%{
        name: "sink",
        type: :slack,
        configuration: %{slack: %{url: "some.url"}}
      }, insert(:user))
    end
  end

  describe "#upsert_router/2" do
    test "an admin can create a notif sink" do
      sink = insert(:notification_sink)
      {:ok, router} = Notifications.upsert_router(%{
        name: "router",
        events: ["service.update"],
        router_sinks: [%{sink_id: sink.id}]
      }, admin_user())

      assert router.name == "router"
      assert router.events == ["service.update"]
      assert hd(router.router_sinks).sink_id == sink.id
    end

    test "it can update a notif sink" do
      sink = insert(:notification_sink)
      router = insert(:notification_router, name: "router")
      {:ok, up} = Notifications.upsert_router(%{
        name: "router",
        events: ["service.update"],
        router_sinks: [%{sink_id: sink.id}]
      }, admin_user())

      assert up.id == router.id
      assert up.name == "router"
      assert up.events == ["service.update"]
      assert hd(up.router_sinks).sink_id == sink.id
    end

    test "non-admins cannot create sinks" do
      sink = insert(:notification_sink)
      {:error, _} = Notifications.upsert_router(%{
        name: "router",
        events: ["service.update"],
        router_sinks: [%{sink_id: sink.id}]
      }, insert(:user))
    end
  end

  describe "#delete_sink/2" do
    test "admins can delete a sink" do
      sink = insert(:notification_sink)

      {:ok, deleted} = Notifications.delete_sink(sink.id, admin_user())

      assert deleted.id == sink.id
      refute refetch(deleted)
    end

    test "non-admins cannot delete" do
      sink = insert(:notification_sink)

      {:error, _} = Notifications.delete_sink(sink.id, insert(:user))
    end
  end

  describe "#delete_router/2" do
    test "admins can delete a router" do
      router = insert(:notification_router)

      {:ok, deleted} = Notifications.delete_router(router.id, admin_user())

      assert deleted.id == router.id
      refute refetch(deleted)
    end

    test "non-admins cannot delete" do
      router = insert(:notification_router)

      {:error, _} = Notifications.delete_router(router.id, insert(:user))
    end
  end

  describe "#deliver/3" do
    test "it can deliver a service.update event" do
      service = insert(:service)
      sink = insert(:notification_sink, type: :slack)
      expect(HTTPoison, :post, fn "https://example.com", res, _ -> {:ok, res} end)

      {:ok, res} = Notifications.deliver(
        "service.update",
        %{service: service, source: %{url: service.repository.url, ref: "main"}},
        sink
      )
      {:ok, _} = Jason.decode(res)
    end
  end
end
