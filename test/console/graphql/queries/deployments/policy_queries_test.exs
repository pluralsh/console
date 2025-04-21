defmodule Console.GraphQl.Deployments.PolicyQueriesTest do
  use Console.DataCase, async: true

  describe "vulnerabilityReports" do
    test "it can fetch reports for a user" do
      reports = insert_list(3, :vulnerability_report)

      {:ok, %{data: %{"vulnerabilityReports" => found}}} = run_query("""
        query {
          vulnerabilityReports(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(reports)
    end
  end

  describe "vulnerabilityStatistics" do
    test "it can count vulns by grade" do
      insert_list(3, :vulnerability_report, grade: :f)
      insert_list(2, :vulnerability_report, grade: :d)
      insert_list(1, :vulnerability_report, grade: :c)
      insert_list(2, :vulnerability_report, grade: :b)
      insert_list(3, :vulnerability_report, grade: :a)

      {:ok, %{data: %{"vulnerabilityStatistics" => found}}} = run_query("""
        query {
          vulnerabilityStatistics {
            grade
            count
          }
        }
      """, %{}, %{current_user: admin_user()})

      by_grade = Map.new(found, & {&1["grade"], &1["count"]})
      assert by_grade["F"] == 3
      assert by_grade["D"] == 2
      assert by_grade["C"] == 1
      assert by_grade["B"] == 2
      assert by_grade["A"] == 3
    end
  end

  describe "vulnerabilityReport" do
    test "it can fetch a vuln report" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      report = insert(:vulnerability_report, cluster: cluster)

      {:ok, %{data: %{"vulnerabilityReport" => vuln}}} = run_query("""
        query Report($id: ID!) {
          vulnerabilityReport(id: $id) { id }
        }
      """, %{"id" => report.id}, %{current_user: user})

      assert vuln["id"] == report.id
    end
  end

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

  describe "policyStatistics" do
    test "it can fetch statistics for policies globally" do
      cluster = insert(:cluster)
      con1 = insert(:policy_constraint, violation_count: 2, cluster: cluster)
      insert_list(2, :constraint_violation, constraint: con1, namespace: "test")

      cluster2 = insert(:cluster)
      insert(:policy_constraint, violation_count: 2, cluster: cluster2)

      {:ok, %{data: %{"policyStatistics" => stats}}} = run_query("""
        query {
          policyStatistics(aggregate: CLUSTER) {
            aggregate
            count
          }
        }
      """, %{}, %{current_user: admin_user()})

      %{"exists" => exist, "none" => none} = Map.new(stats, & {&1["aggregate"], &1})

      assert exist["count"] == 1
      assert none["count"] == 1
    end

    test "it can fetch statistics for policy enforcement globally" do
      cluster = insert(:cluster)
      con1 = insert(:policy_constraint, violation_count: 2, cluster: cluster, enforcement: :warn)
      insert_list(2, :constraint_violation, constraint: con1, namespace: "test")

      cluster2 = insert(:cluster)
      insert(:policy_constraint, violation_count: 2, cluster: cluster2, enforcement: :dry_run)

      {:ok, %{data: %{"policyStatistics" => stats}}} = run_query("""
        query {
          policyStatistics(aggregate: ENFORCEMENT) {
            aggregate
            count
          }
        }
      """, %{}, %{current_user: admin_user()})

      %{"warn" => warn, "dry_run" => dry_run} = Map.new(stats, & {&1["aggregate"], &1})

      assert warn["count"] == 1
      assert dry_run["count"] == 1
    end

    test "it can fetch statistics for installations globally" do
      cluster = insert(:cluster)
      insert(:policy_constraint, violation_count: 2, cluster: cluster, enforcement: :warn)
      cluster2 = insert(:cluster)
      insert(:policy_constraint, cluster: cluster2)
      insert_list(3, :cluster)

      cluster3 = insert(:cluster)
      insert(:policy_constraint, violation_count: 2, cluster: cluster3, enforcement: :dry_run)

      {:ok, %{data: %{"policyStatistics" => stats}}} = run_query("""
        query {
          policyStatistics(aggregate: INSTALLED) {
            aggregate
            count
          }
        }
      """, %{}, %{current_user: admin_user()})

      %{"installed" => installed, "uninstalled" => uninstalled} = Map.new(stats, & {&1["aggregate"], &1})

      assert installed["count"] == 3
      assert uninstalled["count"] == 3
    end
  end

  describe "clusterVulnerabilityAggregate" do
    test "it will fetch counts for grades" do
      admin = admin_user()
      cluster1 = insert(:cluster)
      insert_list(3, :vulnerability_report, grade: :f, cluster: cluster1)
      insert_list(2, :vulnerability_report, grade: :d, cluster: cluster1)
      insert_list(3, :vulnerability_report, grade: :c, cluster: cluster1)
      cluster2 = insert(:cluster)
      insert_list(3, :vulnerability_report, grade: :f, cluster: cluster2)
      cluster3 = insert(:cluster)
      insert_list(3, :vulnerability_report, grade: :a, cluster: cluster3)

      {:ok, %{data: %{"clusterVulnerabilityAggregate" => result}}} = run_query("""
        query {
          clusterVulnerabilityAggregate(grade: D) {
            cluster { id }
            count
          }
        }
      """, %{}, %{current_user: admin})

      by_id = Map.new(result, & {&1["cluster"]["id"], &1})
      assert by_id[cluster1.id]["count"] == 5
      assert by_id[cluster2.id]["count"] == 3
      assert by_id[cluster3.id]["count"] == 0
    end
  end

  describe "complianceReports" do
    test "it can fetch compliance reports" do
      reports = insert_list(3, :compliance_report)

      {:ok, %{data: %{"complianceReports" => found}}} = run_query("""
        query {
          complianceReports(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(reports)
    end
  end
end
