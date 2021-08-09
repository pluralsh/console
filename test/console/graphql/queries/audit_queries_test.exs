defmodule Console.GraphQl.AuditQueriesTest do
  use Console.DataCase, async: true

  describe "audits" do
    test "it can list audits" do
      audits = insert_list(3, :audit)

      {:ok, %{data: %{"audits" => found}}} = run_query("""
        query {
          audits(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(audits)
    end
  end

  describe "auditMetrics" do
    test "it can aggregate metrics by country" do
      insert_list(2, :audit, country: "UK")
      insert_list(4, :audit, country: "US")

      {:ok, %{data: %{"auditMetrics" => metrics}}} = run_query("""
        query {
          auditMetrics { country count }
        }
      """, %{}, %{current_user: insert(:user)})

      grouped = Enum.into(metrics, %{}, & {&1["country"], &1["count"]})
      assert grouped["UK"] == 2
      assert grouped["US"] == 4
    end
  end
end
