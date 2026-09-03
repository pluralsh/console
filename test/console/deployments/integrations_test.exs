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

    test "it enforces the chat connection limit on create" do
      insert_list(20, :chat_connection)

      {:error, msg} = Integrations.upsert_chat_connection(%{
        name: "limit-exceeded",
        type: :slack,
        configuration: %{slack: %{app_token: "token", bot_token: "token", bot_id: "id"}}
      }, admin_user())

      assert msg =~ "chat connection limit"
    end

    test "it allows updating an existing chat connection at the limit" do
      [conn | _] = insert_list(20, :chat_connection)

      {:ok, updated} = Integrations.upsert_chat_connection(%{
        name: conn.name,
        type: :slack,
        configuration: %{slack: %{app_token: "new-token", bot_token: "token", bot_id: "id"}}
      }, admin_user())

      assert updated.configuration.slack.app_token == "new-token"
    end

    test "it can upsert read and write policy bindings" do
      reader = insert(:user)
      writer = insert(:user)

      {:ok, connection} = Integrations.upsert_chat_connection(%{
        name: "bindings-chat",
        type: :slack,
        configuration: %{slack: %{app_token: "token", bot_token: "token", bot_id: "id"}},
        read_bindings: [%{user_id: reader.id}],
        write_bindings: [%{user_id: writer.id}]
      }, admin_user())

      connection = Console.Repo.preload(connection, [:read_bindings, :write_bindings])
      assert [%{user_id: rid}] = connection.read_bindings
      assert [%{user_id: wid}] = connection.write_bindings
      assert rid == reader.id
      assert wid == writer.id
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

    test "it publishes one actionable notification per workbench when a pull request is reopened" do
      hook = insert(:issue_webhook, provider: :github)
      wh = insert(:workbench_webhook, issue_webhook: hook, matches: %{substring: "no match"})
      comment = insert(:issue,
        provider: :github,
        external_id: "myorg/myrepo:comment:1",
        url: "https://github.com/myorg/myrepo/issues/7",
        status: :completed,
        workbench: wh.workbench,
        workbench_webhook: wh
      )

      {:ok, payload} = Issues.Webhook.payload(hook, %{
        "action" => "reopened",
        "pull_request" => %{
          "id" => 2,
          "title" => "Reopened work",
          "body" => "Back to the drawing board",
          "html_url" => "https://github.com/myorg/myrepo/pull/7",
          "state" => "open"
        }
      })
      {:ok, issue} = Integrations.upsert_issue(payload)

      assert issue.status == :open
      assert refetch(comment).status == :open

      issue_id = issue.id
      comment_id = comment.id
      assert_receive {:event, %PubSub.IssueCreated{item: %{id: ^issue_id, status: :open, status_changed: true}}}
      assert_receive {:event, %PubSub.IssueUpdated{item: %{id: ^comment_id, status: :open, status_changed: false}}}
    end

    test "it syncs pull request status into every workbench that already has it" do
      hook = insert(:issue_webhook, provider: :github)
      wh = insert(:workbench_webhook, issue_webhook: hook, matches: %{substring: "Shared pull request"})
      same = insert(:issue,
        provider: :github,
        external_id: "myorg/myrepo:comment:2",
        url: "https://github.com/myorg/myrepo/issues/9",
        status: :open,
        workbench: wh.workbench,
        workbench_webhook: wh
      )
      other = insert(:issue,
        provider: :github,
        external_id: "myorg/myrepo:comment:3",
        url: "https://github.com/myorg/myrepo/issues/9",
        status: :open,
        workbench: insert(:workbench)
      )

      {:ok, payload} = Issues.Webhook.payload(hook, %{
        "action" => "closed",
        "pull_request" => %{
          "id" => 4,
          "title" => "Shared pull request",
          "body" => "Touches a repo tracked by two workbenches",
          "html_url" => "https://github.com/myorg/myrepo/pull/9",
          "state" => "closed",
          "merged" => true
        }
      })
      {:ok, issue} = Integrations.upsert_issue(payload)

      assert issue.workbench_id == wh.workbench.id
      assert issue.status == :completed
      assert refetch(same).status == :completed
      assert refetch(other).status == :completed
    end

    test "it will not inherit scope when the pull request matches several workbenches" do
      hook = insert(:issue_webhook, provider: :github)
      insert(:workbench_webhook, issue_webhook: hook, matches: %{substring: "no match"})
      url = "https://github.com/myorg/myrepo/issues/11"
      first_workbench = insert(:workbench)
      second_workbench = insert(:workbench)
      first = insert(:issue,
        provider: :github,
        external_id: "myorg/myrepo:comment:5",
        url: url,
        status: :open,
        workbench: first_workbench
      )
      second = insert(:issue,
        provider: :github,
        external_id: "myorg/myrepo:comment:6",
        url: url,
        status: :open,
        workbench: second_workbench
      )

      {:ok, payload} = Issues.Webhook.payload(hook, %{
        "action" => "closed",
        "pull_request" => %{
          "id" => 7,
          "title" => "Ambiguous pull request",
          "body" => "Cannot tell which workbench owns this",
          "html_url" => "https://github.com/myorg/myrepo/pull/11",
          "state" => "closed",
          "merged" => true
        }
      })

      {:ok, issue} = Integrations.upsert_issue(payload)

      assert issue.id in [first.id, second.id]
      assert refetch(first).status == :completed
      assert refetch(second).status == :completed
      assert Console.Repo.aggregate(Console.Schema.Issue, :count) == 2
    end
  end
end
