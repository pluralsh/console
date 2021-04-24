defmodule Console.GraphQl.AuditQueriesTest do
  use Console.DataCase, async: true

  describe "audits" do
    test "it can list audits" do
      audits = insert_list(3, :audit)

      {:ok, %{data: %{"audits" => found}}} = run_query("""
        query {
          audits(first: 5) {
            edges {
              node {
                id
              }
            }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(audits)
    end
  end
end
