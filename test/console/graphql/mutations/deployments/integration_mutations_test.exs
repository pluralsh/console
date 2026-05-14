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

    test "it can upsert a chat provider connection with policy bindings" do
      reader = insert(:user)
      writer = insert(:user)

      {:ok, %{data: %{"upsertChatProviderConnection" => connection}}} = run_query("""
        mutation Upsert($attrs: ChatProviderConnectionAttributes!) {
          upsertChatProviderConnection(attributes: $attrs) {
            id
            name
            readBindings { user { id } }
            writeBindings { user { id } }
          }
        }
      """, %{"attrs" => %{
        "name" => "policy-test-connection",
        "type" => "SLACK",
        "configuration" => %{"slack" => %{"app_token" => "token", "bot_token" => "token", "bot_id" => "id"}},
        "readBindings" => [%{"userId" => reader.id}],
        "writeBindings" => [%{"userId" => writer.id}]
      }}, %{current_user: admin_user()})

      assert connection["name"] == "policy-test-connection"
      assert [read_binding] = connection["readBindings"]
      assert [write_binding] = connection["writeBindings"]
      assert read_binding["user"]["id"] == reader.id
      assert write_binding["user"]["id"] == writer.id
    end

    test "it can update policy bindings on upsert" do
      reader = insert(:user)
      other_reader = insert(:user)

      {:ok, _} = run_query("""
        mutation Upsert($attrs: ChatProviderConnectionAttributes!) {
          upsertChatProviderConnection(attributes: $attrs) {
            id
            readBindings { user { id } }
          }
        }
      """, %{"attrs" => %{
        "name" => "upsert-bindings-twice",
        "type" => "SLACK",
        "configuration" => %{"slack" => %{"app_token" => "token", "bot_token" => "token", "bot_id" => "id"}},
        "readBindings" => [%{"userId" => reader.id}],
        "writeBindings" => [%{"userId" => reader.id}]
      }}, %{current_user: admin_user()})

      {:ok, %{data: %{"upsertChatProviderConnection" => updated}}} = run_query("""
        mutation Upsert($attrs: ChatProviderConnectionAttributes!) {
          upsertChatProviderConnection(attributes: $attrs) {
            readBindings { user { id } }
          }
        }
      """, %{"attrs" => %{
        "name" => "upsert-bindings-twice",
        "type" => "SLACK",
        "configuration" => %{"slack" => %{"app_token" => "token", "bot_token" => "token", "bot_id" => "id"}},
        "readBindings" => [%{"userId" => other_reader.id}],
        "writeBindings" => [%{"userId" => other_reader.id}]
      }}, %{current_user: admin_user()})

      assert [read_binding] = updated["readBindings"]
      assert read_binding["user"]["id"] == other_reader.id
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
    test "it can create an issue webhook with policy bindings" do
      reader = insert(:user)
      writer = insert(:user)

      {:ok, %{data: %{"createIssueWebhook" => webhook}}} = run_query("""
        mutation Create($attrs: IssueWebhookAttributes!) {
          createIssueWebhook(attributes: $attrs) {
            id
            provider
            name
            url
            readBindings { user { id } }
            writeBindings { user { id } }
          }
        }
      """, %{"attrs" => %{
        "provider" => "LINEAR",
        "name" => "my-issue-webhook",
        "secret" => "webhook-secret",
        "readBindings" => [%{"userId" => reader.id}],
        "writeBindings" => [%{"userId" => writer.id}]
      }}, %{current_user: admin_user()})

      assert webhook["name"] == "my-issue-webhook"
      assert webhook["provider"] == "LINEAR"
      assert is_binary(webhook["url"])
      assert [read_binding] = webhook["readBindings"]
      assert [write_binding] = webhook["writeBindings"]
      assert read_binding["user"]["id"] == reader.id
      assert write_binding["user"]["id"] == writer.id
    end
  end

  describe "updateIssueWebhook" do
    test "it can update an issue webhook" do
      webhook = insert(:issue_webhook, name: "old-name")
      reader = insert(:user)
      writer = insert(:user)

      {:ok, %{data: %{"updateIssueWebhook" => updated}}} = run_query("""
        mutation Update($id: ID!, $attrs: IssueWebhookAttributes!) {
          updateIssueWebhook(id: $id, attributes: $attrs) {
            id
            name
            readBindings { user { id } }
            writeBindings { user { id } }
          }
        }
      """, %{"id" => webhook.id, "attrs" => %{
        "name" => "new-name",
        "readBindings" => [%{"userId" => reader.id}],
        "writeBindings" => [%{"userId" => writer.id}]
      }}, %{current_user: admin_user()})

      assert updated["id"] == webhook.id
      assert updated["name"] == "new-name"
      assert [read_binding] = updated["readBindings"]
      assert [write_binding] = updated["writeBindings"]
      assert read_binding["user"]["id"] == reader.id
      assert write_binding["user"]["id"] == writer.id
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
