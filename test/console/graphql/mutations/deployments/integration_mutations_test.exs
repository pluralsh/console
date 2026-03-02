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

  describe "createIssueWebhook" do
    test "it can create an issue webhook" do
      {:ok, %{data: %{"createIssueWebhook" => webhook}}} = run_query("""
        mutation Create($attrs: IssueWebhookAttributes!) {
          createIssueWebhook(attributes: $attrs) {
            id
            provider
            name
            url
          }
        }
      """, %{"attrs" => %{
        "provider" => "LINEAR",
        "url" => "https://linear.app/hook/example",
        "name" => "my-issue-webhook",
        "secret" => "webhook-secret"
      }}, %{current_user: admin_user()})

      assert webhook["name"] == "my-issue-webhook"
      assert webhook["provider"] == "LINEAR"
      assert webhook["url"] =~ "/v1/webhooks/issues/"
    end
  end

  describe "updateIssueWebhook" do
    test "it can update an issue webhook" do
      webhook = insert(:issue_webhook, name: "old-name")

      {:ok, %{data: %{"updateIssueWebhook" => updated}}} = run_query("""
        mutation Update($id: ID!, $attrs: IssueWebhookAttributes!) {
          updateIssueWebhook(id: $id, attributes: $attrs) {
            id
            name
          }
        }
      """, %{"id" => webhook.id, "attrs" => %{"name" => "new-name"}}, %{current_user: admin_user()})

      assert updated["id"] == webhook.id
      assert updated["name"] == "new-name"
      assert refetch(webhook).name == "new-name"
    end
  end

  describe "deleteIssueWebhook" do
    test "it can delete an issue webhook" do
      webhook = insert(:issue_webhook)

      {:ok, %{data: %{"deleteIssueWebhook" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteIssueWebhook(id: $id) { id }
        }
      """, %{"id" => webhook.id}, %{current_user: admin_user()})

      assert deleted["id"] == webhook.id
      refute refetch(webhook)
    end
  end
end
