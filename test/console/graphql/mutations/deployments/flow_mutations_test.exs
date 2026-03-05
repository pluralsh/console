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

    test "upsertFlow can set workbenches on create" do
      workbenches = insert_list(2, :workbench)

      {:ok, %{data: %{"upsertFlow" => flow}}} = run_query("""
        mutation upsert($attrs: FlowAttributes!) {
          upsertFlow(attributes: $attrs) {
            id
            name
            workbenches { id }
          }
        }
      """, %{
        "attrs" => %{
          "name" => "flow-with-workbenches",
          "flowWorkbenches" => Enum.map(workbenches, fn w -> %{"workbenchId" => w.id} end)
        }
      }, %{current_user: admin_user()})

      assert flow["name"] == "flow-with-workbenches"
      assert length(flow["workbenches"]) == 2
      assert ids_equal(flow["workbenches"], workbenches)
    end

    test "upsertFlow can set and replace workbenches on update" do
      flow = insert(:flow, name: "update-workbenches-flow")
      wb1 = insert(:workbench)
      insert(:flow_workbench, flow: flow, workbench: wb1)

      wb2 = insert(:workbench)
      wb3 = insert(:workbench)

      {:ok, %{data: %{"upsertFlow" => updated}}} = run_query("""
        mutation upsert($attrs: FlowAttributes!) {
          upsertFlow(attributes: $attrs) {
            id
            name
            workbenches { id }
          }
        }
      """, %{
        "attrs" => %{
          "name" => "update-workbenches-flow",
          "flowWorkbenches" => [%{"workbenchId" => wb2.id}, %{"workbenchId" => wb3.id}]
        }
      }, %{current_user: admin_user()})

      assert updated["id"] == flow.id
      assert length(updated["workbenches"]) == 2
      assert ids_equal(updated["workbenches"], [wb2, wb3])
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

  describe "upsertPreviewEnvironmentTemplate" do
    test "admins can upsert preview environment templates" do
      user = insert(:user)
      flow = insert(:flow, write_bindings: [%{user_id: user.id}])
      svc = insert(:service, flow: flow, namespace: "test")

      {:ok, %{data: %{"upsertPreviewEnvironmentTemplate" => template}}} = run_query("""
        mutation upsert($attrs: PreviewEnvironmentTemplateAttributes!) {
          upsertPreviewEnvironmentTemplate(attributes: $attrs) {
            id
            name
          }
        }
        """, %{
          "attrs" => %{
            "name" => "test",
            "flow_id" => flow.id,
            "template" => %{"namespace" => "test"},
            "reference_service_id" => svc.id
          }
        }, %{current_user: user})

      assert template["id"]
      assert template["name"] == "test"
    end
  end

  describe "deletePreviewEnvironmentTemplate" do
    test "admins can delete preview environment templates" do
      template = insert(:preview_environment_template)

      {:ok, %{data: %{"deletePreviewEnvironmentTemplate" => del}}} = run_query("""
        mutation delete($id: ID!) {
          deletePreviewEnvironmentTemplate(id: $id) {
            id
            name
          }
        }
      """, %{"id" => template.id}, %{current_user: admin_user()})

      assert del["id"] == template.id
      refute refetch(template)
    end
  end
end
