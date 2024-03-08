defmodule Console.GraphQl.Deployments.PolicyMutationsTest do
  use Console.DataCase, async: true

  describe "upsertPolicyConstraints" do
    test "it can create some constraints" do
      {:ok, %{data: %{"upsertPolicyConstraints" => 2}}} = run_query("""
        mutation Upsert($constraints: [PolicyConstraintAttributes]) {
          upsertPolicyConstraints(constraints: $constraints)
        }
      """, %{"constraints" => [
        %{
          "name" => "some-constraint",
          "ref" => %{"kind" => "K8sSomePolicy", "name" => "some-constraint"},
          "violation_count" => 0,
          "violations" => []
        }
      ]}, %{cluster: insert(:cluster)})
    end
  end
end
