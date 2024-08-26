defmodule Console.GraphQl.Deployments.NotificationQueriesTest do
  use Console.DataCase, async: true

  describe "notificationSink" do
    test "sinks can be fetched by name" do
      sink = insert(:notification_sink)

      {:ok, %{data: %{"notificationSink" => found}}} = run_query("""
        query Sink($name: String!) {
          notificationSink(name: $name) { id }
        }
      """, %{"name" => sink.name}, %{current_user: insert(:user)})

      assert found["id"] == sink.id
    end
  end

  describe "notificationRouter" do
    test "routers can be fetched by name" do
      router = insert(:notification_router)

      {:ok, %{data: %{"notificationRouter" => found}}} = run_query("""
        query router($name: String!) {
          notificationRouter(name: $name) { id }
        }
      """, %{"name" => router.name}, %{current_user: insert(:user)})

      assert found["id"] == router.id
    end

    test "it can sideload filters" do
      router = insert(:notification_router)
      filters = insert_list(3, :router_filter, router: router)

      {:ok, %{data: %{"notificationRouter" => found}}} = run_query("""
        query router($name: String!) {
          notificationRouter(name: $name) {
            id
            filters { id }
          }
        }
      """, %{"name" => router.name}, %{current_user: insert(:user)})

      assert found["id"] == router.id
      assert ids_equal(found["filters"], filters)
    end
  end

  describe "notificationSinks" do
    test "it can list sinks" do
      sinks = insert_list(3, :notification_sink)

      {:ok, %{data: %{"notificationSinks" => found}}} = run_query("""
        query {
          notificationSinks(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(sinks)
    end
  end

  describe "notificationRouters" do
    test "it can list routers" do
      routers = insert_list(3, :notification_router)

      {:ok, %{data: %{"notificationRouters" => found}}} = run_query("""
        query {
          notificationRouters(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(routers)
    end
  end

  describe "appNotifications" do
    test "lists the notifs for a user" do
      user = insert(:user)
      notifs = insert_list(3, :app_notification, user: user)
      insert_list(3, :app_notification)

      {:ok, %{data: %{"appNotifications" => found}}} = run_query("""
        query {
          appNotifications(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(notifs)
    end
  end

  describe "unreadAppNotifications" do
    test "counts the unread notifs for a user" do
      user = insert(:user)
      insert_list(3, :app_notification, user: user)
      insert_list(3, :app_notification, user: user, read_at: Timex.now())
      insert_list(3, :app_notification)

      {:ok, %{data: %{"unreadAppNotifications" => 3}}} = run_query("""
        query {
          unreadAppNotifications
        }
      """, %{}, %{current_user: user})
    end
  end
end
