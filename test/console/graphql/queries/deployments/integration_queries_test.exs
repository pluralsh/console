defmodule Console.GraphQl.Deployments.IntegrationQueriesTest do
  use Console.DataCase, async: true

  describe "chatProviderConnections" do
    test "it can list chat provider connections" do
      connections = insert_list(3, :chat_connection)


      {:ok, %{data: %{"chatProviderConnections" => found}}} = run_query("""
        query {
          chatProviderConnections(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(connections)
    end
  end

  describe "chatProviderConnection" do
    test "it can fetch a chat provider connection" do
      connection = insert(:chat_connection)
      {:ok, %{data: %{"chatProviderConnection" => found}}} = run_query("""
        query Connection($id: ID!) {
          chatProviderConnection(id: $id) { id }
        }
      """, %{"id" => connection.id}, %{current_user: admin_user()})

      assert found["id"] == connection.id
    end

    test "it can fetch a chat provider connection by name" do
      connection = insert(:chat_connection)
      {:ok, %{data: %{"chatProviderConnection" => found}}} = run_query("""
        query Connection($name: String!) {
          chatProviderConnection(name: $name) { id }
        }
      """, %{"name" => connection.name}, %{current_user: admin_user()})

      assert found["id"] == connection.id
    end
  end
end
