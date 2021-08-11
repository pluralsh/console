defmodule Console.GraphQl.PolicyQueriesTest do
  use Console.DataCase, async: true

  describe "upgradePolicies" do
    test "it will list upgrade policies" do
      policies = insert_list(3, :upgrade_policy)

      Console.Cache.delete(:upgrade_policies)
      {:ok, %{data: %{"upgradePolicies" => found}}} = run_query("""
        query {
          upgradePolicies { id }
        }
      """, %{}, %{current_user: insert(:user)})

      assert ids_equal(policies, found)
    end
  end
end
