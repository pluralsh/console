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

  describe "readAppNotifications" do
    test "it will mark a users notifs as read" do
      user = insert(:user)
      notifs = insert_list(3, :app_notification, user: user)

      {:ok, %{data: %{"readAppNotifications" => 3}}} = run_query("""
        mutation {
          readAppNotifications
        }
      """, %{}, %{current_user: user})

      for n <- notifs,
        do: assert refetch(n).read_at
    end
  end

  describe "shareSecret" do
    test "it can share a secret" do
      user = insert(:user)

      {:ok, %{data: %{"shareSecret" => share}}} = run_query("""
        mutation Share($attributes: SharedSecretAttributes!) {
          shareSecret(attributes: $attributes) {
            name
            secret
          }
        }
      """, %{"attributes" => %{
        "name" => "my secret",
        "secret" => "something",
        "notificationBindings" => [%{"userId" => user.id}]
      }}, %{current_user: insert(:user)})

      assert share["name"] == "my secret"
      assert share["secret"] == "something"
    end
  end

  describe "consumeSecret" do
    test "it can read and consume a given shared secret" do
      user = insert(:user)
      secret = insert(:shared_secret, notification_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"consumeSecret" => consume}}} = run_query("""
        mutation Consume($handle: String!) {
          consumeSecret(handle: $handle) {
            secret
          }
        }
      """, %{"handle" => secret.handle}, %{current_user: user})

      assert consume["secret"] == secret.secret
      refute refetch(secret)
    end
  end
end
