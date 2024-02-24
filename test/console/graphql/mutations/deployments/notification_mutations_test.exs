defmodule Console.GraphQl.Deployments.NotificationMutationsTest do
  use Console.DataCase, async: true

  describe "upsertNotificationSink" do
    test "it can create a notification sink" do
      {:ok, %{data: %{"upsertNotificationSink" => sink}}} = run_query("""
        mutation Upsert($attrs: NotificationSinkAttributes!) {
          upsertNotificationSink(attributes: $attrs) {
            id
            name
            type
            configuration { slack { url } }
          }
        }
      """, %{
        "attrs" => %{
          "name" => "sink",
          "type" => "SLACK",
          "configuration" => %{"slack" => %{"url" => "https://example.com"}}
        }
      }, %{current_user: admin_user()})

      assert sink["name"] == "sink"
      assert sink["type"] == "SLACK"
      assert sink["configuration"]["slack"]["url"] == "https://example.com"
    end
  end

  describe "upsertNotificationRouter" do
    test "it can upsert a notif router" do
      sink = insert(:notification_sink)
      {:ok, %{data: %{"upsertNotificationRouter" => router}}} = run_query("""
        mutation Upsert($attrs: NotificationRouterAttributes!) {
          upsertNotificationRouter(attributes: $attrs) {
            id
            name
            events
            sinks { id }
          }
        }
      """, %{"attrs" => %{
        "name" => "router",
        "events" => ["service.update"],
        "routerSinks" => [%{"sinkId" => sink.id}]
      }}, %{current_user: admin_user()})

      assert router["id"]
      assert router["name"] == "router"
      assert router["events"] == ["service.update"]
      assert router["sinks"] == [%{"id" => sink.id}]
    end
  end

  describe "deleteNotificationSink" do
    test "admins can delete sinks" do
      sink = insert(:notification_sink)

      {:ok, %{data: %{"deleteNotificationSink" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteNotificationSink(id: $id) { id }
        }
      """, %{"id" => sink.id}, %{current_user: admin_user()})

      assert deleted["id"] == sink.id
      refute refetch(sink)
    end
  end

  describe "deleteNotificationRouter" do
    test "admins can delete sinks" do
      router = insert(:notification_router)

      {:ok, %{data: %{"deleteNotificationRouter" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteNotificationRouter(id: $id) { id }
        }
      """, %{"id" => router.id}, %{current_user: admin_user()})

      assert deleted["id"] == router.id
      refute refetch(router)
    end
  end
end
