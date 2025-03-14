defmodule Console.GraphQl.Deployments.FlowMutationsTest do
  use Console.DataCase, async: true

  describe "upsertFlow" do
    test "admins can upsert flows" do
      {:ok, %{data: %{"upsertFlow" => flow}}} = run_query("""
        mutation upsert($attrs: FlowAttributes!) {
          upsertFlow(attributes: $attrs) {
            id
            name
          }
        }
      """, %{"attrs" => %{"name" => "test"}}, %{current_user: admin_user()})

      assert flow["name"] == "test"
    end
  end

  describe "deleteFlow" do
    test "admins can delete flows" do
      flow = insert(:flow)

      {:ok, %{data: %{"deleteFlow" => del}}} = run_query("""
        mutation delete($id: ID!) {
          deleteFlow(id: $id) {
            id
            name
          }
        }
      """, %{"id" => flow.id}, %{current_user: admin_user()})

      assert del["id"] == flow.id
      refute refetch(flow)
    end
  end

  describe "upsertMcpServer" do
    test "admins can upsert McpServers" do
      {:ok, %{data: %{"upsertMcpServer" => server}}} = run_query("""
        mutation upsert($attrs: McpServerAttributes!) {
          upsertMcpServer(attributes: $attrs) {
            id
            name
          }
        }
      """, %{"attrs" => %{"name" => "test", "url" => "https://example.com"}}, %{current_user: admin_user()})

      assert server["name"] == "test"
    end
  end

  describe "deleteMcpServer" do
    test "admins can delete mcp servers" do
      mcp_server = insert(:mcp_server)

      {:ok, %{data: %{"deleteMcpServer" => del}}} = run_query("""
        mutation delete($id: ID!) {
          deleteMcpServer(id: $id) {
            id
            name
          }
        }
      """, %{"id" => mcp_server.id}, %{current_user: admin_user()})

      assert del["id"] == mcp_server.id
      refute refetch(mcp_server)
    end
  end
end
