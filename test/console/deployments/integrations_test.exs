defmodule Console.Deployments.IntegrationsTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Integrations

  describe "#upsert_chat_connection/2" do
    test "it can upsert a chat connection" do
      {:ok, connection} = Integrations.upsert_chat_connection(%{
        name: "test",
        type: :slack,
        configuration: %{slack: %{app_token: "token", bot_token: "token", bot_id: "id"}}
      }, admin_user())

      assert connection.name == "test"
      assert connection.type == :slack
      assert connection.configuration.slack.app_token == "token"
      assert connection.configuration.slack.bot_token == "token"
      assert connection.configuration.slack.bot_id == "id"
    end
  end

  describe "#delete_chat_connection/2" do
    test "it can delete a chat connection" do
      connection = insert(:chat_connection)

      {:ok, deleted} = Integrations.delete_chat_connection(connection.id, admin_user())
      assert deleted.id == connection.id

      refute refetch(connection)
    end
  end
end
