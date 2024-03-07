defmodule Console.GraphQl.Deployments.PolicyQueriesTest do
  use Console.DataCase, async: true

  describe "policyConstraint" do
    test "admins can query a policy constraint by id" do
      constraint = insert(:policy_constraint)

      {:ok, %{data: %{"policyConstraint" => found}}} = run_query("""
        query Constraint($id: ID!) {
          policyConstraint(id: $id) {
            id
          }
        }
      """, %{"id" => constraint.id}, %{current_user: admin_user()})

      assert found["id"] == constraint.id
    end

    test "cluster readers can query a policy constraint by id" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      constraint = insert(:policy_constraint, cluster: cluster)

      {:ok, %{data: %{"policyConstraint" => found}}} = run_query("""
        query Constraint($id: ID!) {
          policyConstraint(id: $id) {
            id
          }
        }
      """, %{"id" => constraint.id}, %{current_user: user})

      assert found["id"] == constraint.id
    end

    test "random users cannot query constraints" do
      constraint = insert(:policy_constraint)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Constraint($id: ID!) {
          policyConstraint(id: $id) {
            id
          }
        }
      """, %{"id" => constraint.id}, %{current_user: insert(:user)})
    end
  end
end
