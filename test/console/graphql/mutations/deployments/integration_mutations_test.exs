defmodule Console.GraphQl.Deployments.IntegrationMutationsTest do
  use Console.DataCase, async: true

  describe "upsertChatProviderConnection" do
    test "it can upsert a chat provider connection" do
      {:ok, %{data: %{"upsertChatProviderConnection" => connection}}} = run_query("""
        mutation Upsert($attrs: ChatProviderConnectionAttributes!) {
          upsertChatProviderConnection(attributes: $attrs) { id name type }
        }
      """, %{"attrs" => %{
        "name" => "test",
        "type" => "SLACK",
        "configuration" => %{"slack" => %{"app_token" => "token", "bot_token" => "token", "bot_id" => "id"}}
      }}, %{current_user: admin_user()})

      assert connection["name"] == "test"
      assert connection["type"] == "SLACK"
    end
  end

  describe "deleteChatProviderConnection" do
    test "it can delete a chat provider connection" do
      connection = insert(:chat_connection)
      {:ok, %{data: %{"deleteChatProviderConnection" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteChatProviderConnection(id: $id) { id }
        }
      """, %{"id" => connection.id}, %{current_user: admin_user()})

      assert deleted["id"] == connection.id
      refute refetch(connection)
    end
  end
end
