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

    test "it lists only chat provider connections accessible to the current user" do
      user = insert(:user)
      allowed = insert(:chat_connection, read_bindings: [%{user_id: user.id}])
      _denied = insert(:chat_connection)

      {:ok, %{data: %{"chatProviderConnections" => found}}} = run_query("""
        query {
          chatProviderConnections(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([allowed])
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

    test "it returns policy bindings on a chat provider connection" do
      reader = insert(:user)
      writer = insert(:user)

      connection =
        insert(:chat_connection,
          read_bindings: [%{user_id: reader.id}],
          write_bindings: [%{user_id: writer.id}]
        )

      {:ok, %{data: %{"chatProviderConnection" => found}}} = run_query("""
        query Connection($id: ID!) {
          chatProviderConnection(id: $id) {
            id
            readBindings { user { id } }
            writeBindings { user { id } }
          }
        }
      """, %{"id" => connection.id}, %{current_user: admin_user()})

      assert found["id"] == connection.id
      assert [read_binding] = found["readBindings"]
      assert [write_binding] = found["writeBindings"]
      assert read_binding["user"]["id"] == reader.id
      assert write_binding["user"]["id"] == writer.id
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

  describe "issueWebhook" do
    test "it can fetch an issue webhook by id" do
      webhook = insert(:issue_webhook)

      {:ok, %{data: %{"issueWebhook" => found}}} = run_query("""
        query IssueWebhook($id: ID!) {
          issueWebhook(id: $id) { id provider name url }
        }
      """, %{"id" => webhook.id}, %{current_user: admin_user()})

      assert found["id"] == webhook.id
      assert found["provider"] == "LINEAR"
      assert found["name"] == webhook.name
      assert found["url"] =~ "/v1/webhooks/issues/"
    end

    test "it can fetch an issue webhook by name" do
      webhook = insert(:issue_webhook)

      {:ok, %{data: %{"issueWebhook" => found}}} = run_query("""
        query IssueWebhook($name: String!) {
          issueWebhook(name: $name) { id name }
        }
      """, %{"name" => webhook.name}, %{current_user: admin_user()})

      assert found["id"] == webhook.id
      assert found["name"] == webhook.name
    end
  end

  describe "issueWebhooks" do
    test "it can list issue webhooks" do
      webhooks = insert_list(3, :issue_webhook)

      {:ok, %{data: %{"issueWebhooks" => found}}} = run_query("""
        query {
          issueWebhooks(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(webhooks)
    end

    test "it lists only issue webhooks accessible to the current user" do
      user = insert(:user)
      allowed = insert(:issue_webhook, read_bindings: [%{user_id: user.id}])
      _denied = insert(:issue_webhook)

      {:ok, %{data: %{"issueWebhooks" => found}}} = run_query("""
        query {
          issueWebhooks(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([allowed])
    end
  end
end
