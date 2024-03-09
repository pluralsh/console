defmodule Console.GraphQl.Deployments.PolicyQueriesTest do
  use Console.DataCase, async: true

  describe "cluster" do
    test "it can fetch namespace constraint statistics for a cluster" do
      cluster = insert(:cluster)
      con1 = insert(:policy_constraint, violation_count: 2, cluster: cluster)
      insert_list(2, :constraint_violation, constraint: con1, namespace: "test")

      {:ok, %{data: %{"cluster" => %{"violationStatistics" => [res]}}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) {
            violationStatistics(field: NAMESPACE) { value count violations }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})

      assert res["value"] == "test"
      assert res["count"] == 1
      assert res["violations"] == 2
    end

    test "it can fetch namespace kind statistics for a cluster" do
      cluster = insert(:cluster)
      con1 = insert(:policy_constraint, cluster: cluster)
      insert_list(2, :constraint_violation, constraint: con1, kind: "Service")

      {:ok, %{data: %{"cluster" => %{"violationStatistics" => [res]}}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) {
            violationStatistics(field: KIND) { value count violations }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})

      assert res["value"] == "Service"
      assert res["count"] == 1
      assert res["violations"] == 2
    end
  end

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

  describe "policyConstraints" do
    test "it can fetch constraints for all accessible clusters" do
      [cluster1, cluster2] = insert_list(2, :cluster)
      first = insert_list(2, :policy_constraint, cluster: cluster1)
      second = insert_list(3, :policy_constraint, cluster: cluster2)

      {:ok, %{data: %{"policyConstraints" => found}}} = run_query("""
        query {
          policyConstraints(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(first ++ second)
    end
  end

  describe "violationStatistics" do
    test "it can fetch statistics for violations globally" do
      cluster = insert(:cluster)
      con1 = insert(:policy_constraint, violation_count: 2, cluster: cluster)
      insert_list(2, :constraint_violation, constraint: con1, namespace: "test")

      cluster2 = insert(:cluster)
      con2 = insert(:policy_constraint, violation_count: 2, cluster: cluster2)
      insert_list(2, :constraint_violation, constraint: con2, namespace: "stage")

      {:ok, %{data: %{"violationStatistics" => stats}}} = run_query("""
        query {
          violationStatistics(field: NAMESPACE) {
            value
            count
            violations
          }
        }
      """, %{}, %{current_user: admin_user()})

      %{"test" => test, "stage" => stage} = Map.new(stats, & {&1["value"], &1})

      assert test["count"] == 1
      assert test["violations"] == 2

      assert stage["count"] == 1
      assert stage["violations"] == 2
    end
  end
end
