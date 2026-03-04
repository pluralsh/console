defmodule Console.Deployments.IntegrationsTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Integrations
  alias Console.PubSub

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

  describe "#create_issue_webhook/2" do
    test "admin can create an issue webhook" do
      admin = admin_user()

      {:ok, webhook} = Integrations.create_issue_webhook(%{
        provider: :linear,
        url: "https://issues.example.com/webhook",
        name: "test-issue-webhook",
        secret: "webhook-secret"
      }, admin)

      assert webhook.name == "test-issue-webhook"
      assert webhook.url == "https://issues.example.com/webhook"
      assert webhook.provider == :linear
      assert_receive {:event, %PubSub.IssueWebhookCreated{item: ^webhook}}
    end

    test "non-admin cannot create an issue webhook" do
      user = insert(:user)

      {:error, _} =
        Integrations.create_issue_webhook(%{
          provider: :linear,
          url: "https://issues.example.com/webhook",
          name: "test-issue-webhook",
          secret: "webhook-secret"
        }, user)
    end
  end

  describe "#update_issue_webhook/3" do
    test "admin can update an issue webhook" do
      admin = admin_user()
      webhook = insert(:issue_webhook)

      {:ok, updated} = Integrations.update_issue_webhook(%{
        name: "updated-name"
      }, webhook.id, admin)

      assert updated.name == "updated-name"
      assert_receive {:event, %PubSub.IssueWebhookUpdated{item: ^updated}}
    end

    test "non-admin cannot update an issue webhook" do
      user = insert(:user)
      webhook = insert(:issue_webhook)

      {:error, _} = Integrations.update_issue_webhook(%{
        name: "updated-name"
      }, webhook.id, user)
    end
  end

  describe "#delete_issue_webhook/2" do
    test "admin can delete an issue webhook" do
      admin = admin_user()
      webhook = insert(:issue_webhook)

      {:ok, deleted} = Integrations.delete_issue_webhook(webhook.id, admin)

      assert deleted.id == webhook.id
      refute refetch(webhook)
      assert_receive {:event, %PubSub.IssueWebhookDeleted{item: ^deleted}}
    end

    test "non-admin cannot delete an issue webhook" do
      user = insert(:user)
      webhook = insert(:issue_webhook)

      {:error, _} = Integrations.delete_issue_webhook(webhook.id, user)

      assert refetch(webhook)
    end
  end
end
