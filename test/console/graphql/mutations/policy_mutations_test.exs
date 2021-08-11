defmodule Console.GraphQl.PolicyMutationsTest do
  use Console.DataCase, async: true

  describe "createUpgradePolicy" do
    test "it can create an upgrade policy" do
      admin = insert(:user, roles: %{admin: true})

      {:ok, %{data: %{"createUpgradePolicy" => policy}}} = run_query("""
        mutation Create($attributes: UpgradePolicyAttributes!) {
          createUpgradePolicy(attributes: $attributes) {
            id
            name
            type
            target
          }
        }
      """, %{"attributes" => %{
        "name" => "pol",
        "type" => "DEPLOY",
        "target" => "repo"
      }}, %{current_user: admin})

      assert policy["id"]
      assert policy["name"] == "pol"
      assert policy["type"] == "DEPLOY"
      assert policy["target"] == "repo"
    end
  end

  describe "deleteUpgradePolicy" do
    test "it can delete an upgrade policy" do
      policy = insert(:upgrade_policy)
      admin  = insert(:user, roles: %{admin: true})

      {:ok, %{data: %{"deleteUpgradePolicy" => del}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteUpgradePolicy(id: $id) { id }
        }
      """, %{"id" => policy.id}, %{current_user: admin})

      assert del["id"] == policy.id

      refute refetch(policy)
    end
  end
end
