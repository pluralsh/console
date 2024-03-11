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
end
