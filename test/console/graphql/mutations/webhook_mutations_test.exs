defmodule Console.GraphQl.WebhookMutationsTest do
  use Console.DataCase, async: true

  describe "createWebhook" do
    test "It can create a new webhook" do
      {:ok, %{data: %{"createWebhook" => webhook}}} = run_query("""
        mutation CreateWH($url: String!) {
          createWebhook(attributes: {url: $url}) {
            id
            url
          }
        }
      """, %{"url" => "https://example.com"}, %{current_user: insert(:user)})

      assert webhook["id"]
      assert webhook["url"] == "https://example.com"
    end
  end

  describe "deleteWebhook" do
    test "It can create a new webhook" do
      hook = insert(:webhook)
      {:ok, %{data: %{"deleteWebhook" => webhook}}} = run_query("""
        mutation delete($id: ID!) {
          deleteWebhook(id: $id) { id }
        }
      """, %{"id" => hook.id}, %{current_user: insert(:user)})

      assert webhook["id"] == hook.id
      refute refetch(hook)
    end
  end
end
