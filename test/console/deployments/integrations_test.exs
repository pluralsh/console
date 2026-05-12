defmodule Console.Deployments.IntegrationsTest do
  use Console.DataCase, async: true
  alias Console.Deployments.{Integrations, Issues}
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
        name: "test-issue-webhook",
        secret: "webhook-secret"
      }, admin)

      assert webhook.name == "test-issue-webhook"
      assert Console.Schema.IssueWebhook.url(webhook)
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

  describe "#upsert_issue/2" do
    test "it can upsert an issue and properly mark state as changed" do
      hook = insert(:issue_webhook, provider: :linear)
      wh = insert(:workbench_webhook, issue_webhook: hook, matches: %{substring: "Fix"})
      linear_issue = %{
        "id" => "linear-issue-ext-123",
        "title" => "Fix login bug",
        "url" => "https://linear.app/team/issue/123",
        "description" => "Users cannot log in on mobile",
        "state" => %{"name" => "In Progress"},
      }

      {:ok, payload} = Issues.Webhook.payload(hook, %{"type" => "Issue", "data" => linear_issue})
      {:ok, issue} = Integrations.upsert_issue(payload)

      assert issue.status_changed
      assert issue.status == :in_progress
      assert issue.title == "Fix login bug"
      assert issue.url == "https://linear.app/team/issue/123"
      assert issue.body == "Users cannot log in on mobile"
      assert issue.payload == linear_issue
      assert issue.workbench_id == wh.workbench.id
      assert issue.webhook.id == wh.id

      assert_receive {:event, %PubSub.IssueCreated{item: ^issue}}
    end
  end
end
