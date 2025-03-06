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
end
