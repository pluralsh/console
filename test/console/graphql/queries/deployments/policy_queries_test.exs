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

  describe "complianceReportGenerators" do
    test "it can list the accessible compliance report generators for a user" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)

      gen1 = insert(:compliance_report_generator, read_bindings: [%{user_id: user.id}])
      gen2 = insert(:compliance_report_generator, read_bindings: [%{group_id: group.id}])
      insert(:compliance_report_generator)

      {:ok, %{data: %{"complianceReportGenerators" => found}}} = run_query("""
        query {
          complianceReportGenerators(first: 5) {
            edges { node { id name } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([gen1, gen2])
    end
  end

  describe "complianceReportGenerator" do
    test "it can fetch a compliance report generator by id" do
      gen = insert(:compliance_report_generator)

      {:ok, %{data: %{"complianceReportGenerator" => found}}} = run_query("""
        query ComplianceReportGenerator($id: ID!) {
          complianceReportGenerator(id: $id) { id name }
        }
      """, %{"id" => gen.id}, %{current_user: admin_user()})

      assert found["id"] == gen.id
      assert found["name"] == gen.name
    end

    test "it can sideload reports on a generator" do
      user = insert(:user)
      gen = insert(:compliance_report_generator, read_bindings: [%{user_id: user.id}])

      reports = insert_list(3, :compliance_report, generator: gen)
      insert_list(3, :compliance_report)

      {:ok, %{data: %{"complianceReportGenerator" => found}}} = run_query("""
        query ComplianceReportGenerator($id: ID!) {
          complianceReportGenerator(id: $id) {
            id
            name
            complianceReports(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => gen.id}, %{current_user: user})

      assert found["id"]   == gen.id
      assert found["name"] == gen.name

      assert from_connection(found["complianceReports"])
             |> ids_equal(reports)
    end

    test "it can fetch a compliance report generator by name" do
      gen = insert(:compliance_report_generator, name: "my-generator")

      {:ok, %{data: %{"complianceReportGenerator" => found}}} = run_query("""
        query ComplianceReportGenerator($name: String!) {
          complianceReportGenerator(name: $name) { id name }
        }
      """, %{"name" => gen.name}, %{current_user: admin_user()})

      assert found["id"] == gen.id
      assert found["name"] == gen.name
    end

    test "users not within policy cannot view report generators" do
      gen = insert(:compliance_report_generator)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query ComplianceReportGenerator($id: ID!) {
          complianceReportGenerator(id: $id) { id name }
        }
      """, %{"id" => gen.id}, %{current_user: insert(:user)})
    end
  end

  describe "policyEvaluations" do
    test "lists only sampled evaluations containing a readable policy" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      policy = insert(:policy, project: project)
      other_policy = insert(:policy)

      evaluation =
        %Console.Schema.PolicyEvaluation{}
        |> Console.Schema.PolicyEvaluation.changeset(%{
          policy_ids: [policy.id, other_policy.id],
          input: %{"tool" => "kube_update"},
          output: %{"deny" => []}
        })
        |> Repo.insert!()

      {:ok, %{data: %{"policy" => %{"policyEvaluations" => found}}}} = run_query("""
        query PolicyEvaluations($policyId: ID!) {
          policy(id: $policyId) {
            policyEvaluations(first: 5) {
              edges { node { id policyIds input output } }
            }
          }
        }
      """, %{"policyId" => policy.id}, %{current_user: user})

      assert from_connection(found) |> ids_equal([evaluation])
    end

    test "evaluates readable policies against supplied input" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])

      policy = insert(:policy,
        project: project,
        policy: """
        package plrl.wb.admission

        sample := 0

        deny[{"message": "blocked"}] if {
          input.blocked == true
        }
        """
      )

      {:ok, %{data: %{"evaluatePolicy" => result}}} = run_query("""
        query EvaluatePolicy($policyId: ID!, $input: Json!) {
          evaluatePolicy(policyId: $policyId, input: $input)
        }
      """, %{"policyId" => policy.id, "input" => Jason.encode!(%{"blocked" => true})}, %{current_user: user})

      assert [%{"message" => "blocked"}] = result["deny"]
    end

    test "evaluates binding policies with the binding base" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      policy = insert(:policy, project: project, type: :binding, policy: "package plrl.binding\nbind := true")

      {:ok, %{data: %{"evaluatePolicy" => result}}} = run_query("""
        query EvaluatePolicy($policyId: ID!, $input: Json!) {
          evaluatePolicy(policyId: $policyId, input: $input)
        }
      """, %{"policyId" => policy.id, "input" => Jason.encode!(%{})}, %{current_user: user})

      assert result["bind"]
    end

    test "evaluates stack policies with the stack approval base" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])

      policy = insert(:policy,
        project: project,
        type: :stack,
        policy: """
        package plrl.stack

        sample := 0

        deny[{"message": "blocked"}] if {
          input.blocked == true
        }

        defer if input.wait == true

        approve[{"reason": "safe"}] if {
          input.approve == true
        }
        """
      )

      {:ok, %{data: %{"evaluatePolicy" => denied}}} = run_query("""
        query EvaluatePolicy($policyId: ID!, $input: Json!) {
          evaluatePolicy(policyId: $policyId, input: $input)
        }
      """, %{"policyId" => policy.id, "input" => Jason.encode!(%{"blocked" => true})}, %{current_user: user})

      assert [%{"message" => "blocked"}] = denied["deny"]
      refute denied["defer"]
      assert denied["approve"] == []

      {:ok, %{data: %{"evaluatePolicy" => deferred}}} = run_query("""
        query EvaluatePolicy($policyId: ID!, $input: Json!) {
          evaluatePolicy(policyId: $policyId, input: $input)
        }
      """, %{"policyId" => policy.id, "input" => Jason.encode!(%{"wait" => true})}, %{current_user: user})

      assert deferred["deny"] == []
      assert deferred["defer"]
      assert deferred["approve"] == []

      {:ok, %{data: %{"evaluatePolicy" => approved}}} = run_query("""
        query EvaluatePolicy($policyId: ID!, $input: Json!) {
          evaluatePolicy(policyId: $policyId, input: $input)
        }
      """, %{"policyId" => policy.id, "input" => Jason.encode!(%{"approve" => true})}, %{current_user: user})

      assert approved["deny"] == []
      refute approved["defer"]
      assert [%{"reason" => "safe"}] = approved["approve"]
    end

    test "denies evaluation history to users without policy access" do
      policy = insert(:policy)

      {:ok, %{data: %{"policy" => nil}, errors: [_ | _]}} = run_query("""
        query PolicyEvaluations($policyId: ID!) {
          policy(id: $policyId) {
            policyEvaluations(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"policyId" => policy.id}, %{current_user: insert(:user)})
    end
  end

  describe "bindingPolicies" do
    test "returns matchCount for bind policies" do
      bind_policy = insert(:policy, type: :binding)
      attached = insert(:policy)
      insert(:binding_policy, policy: attached, bind_policy: bind_policy, type: :workbench)
      insert_list(2, :workbench_policy, policy: attached)
      insert(:workbench_policy)

      {:ok, %{data: %{"policy" => found}}} = run_query("""
        query Policy($id: ID!) {
          policy(id: $id) { id matchCount }
        }
      """, %{"id" => bind_policy.id}, %{current_user: admin_user()})

      assert found["matchCount"] == 2
    end

    test "lists stack and workbench policy associations" do
      policy = insert(:policy)
      stack_policies = insert_list(2, :stack_policy, policy: policy)
      workbench_policies = insert_list(2, :workbench_policy, policy: policy)

      {:ok, %{data: %{"policy" => found}}} = run_query("""
        query Policy($id: ID!) {
          policy(id: $id) {
            stackPolicies(first: 5) {
              edges { node { id policy { id } stack { id } } }
            }
            workbenchPolicies(first: 5) {
              edges { node { id policy { id } workbench { id } } }
            }
          }
        }
      """, %{"id" => policy.id}, %{current_user: admin_user()})

      assert from_connection(found["stackPolicies"]) |> ids_equal(stack_policies)
      assert from_connection(found["workbenchPolicies"]) |> ids_equal(workbench_policies)
    end

    test "lists mixed workbench and stack attachments" do
      policy = insert(:policy)
      workbench_policy = insert(:workbench_policy, policy: policy)
      stack_policy = insert(:stack_policy, policy: policy)

      {:ok, %{data: %{"policy" => found}}} = run_query("""
        query Policy($id: ID!) {
          policy(id: $id) {
            attachments(first: 5) {
              edges {
                node {
                  id
                  type
                  workbench { id }
                  stack { id }
                }
              }
            }
          }
        }
      """, %{"id" => policy.id}, %{current_user: admin_user()})

      attachments = from_connection(found["attachments"])
      by_id = Map.new(attachments, & {&1["id"], &1})

      assert ids_equal(attachments, [workbench_policy, stack_policy])
      assert by_id[workbench_policy.id]["type"] == "WORKBENCH"
      assert by_id[workbench_policy.id]["workbench"]["id"] == workbench_policy.workbench_id
      assert by_id[workbench_policy.id]["stack"] == nil
      assert by_id[stack_policy.id]["type"] == "STACK"
      assert by_id[stack_policy.id]["stack"]["id"] == stack_policy.stack_id
      assert by_id[stack_policy.id]["workbench"] == nil
    end

    test "paginates mixed workbench and stack attachments" do
      policy = insert(:policy)
      insert_list(3, :workbench_policy, policy: policy)
      insert_list(2, :stack_policy, policy: policy)

      {:ok, %{data: %{"policy" => found}}} = run_query("""
        query Policy($id: ID!) {
          policy(id: $id) {
            attachments(first: 2) {
              pageInfo { hasNextPage endCursor }
              edges { node { id } }
            }
          }
        }
      """, %{"id" => policy.id}, %{current_user: admin_user()})

      assert length(found["attachments"]["edges"]) == 2
      assert found["attachments"]["pageInfo"]["hasNextPage"]

      {:ok, %{data: %{"policy" => found}}} = run_query("""
        query Policy($id: ID!, $after: String) {
          policy(id: $id) {
            attachments(first: 5, after: $after) {
              pageInfo { hasNextPage }
              edges { node { id } }
            }
          }
        }
      """, %{"id" => policy.id, "after" => found["attachments"]["pageInfo"]["endCursor"]}, %{current_user: admin_user()})

      assert length(found["attachments"]["edges"]) == 3
      refute found["attachments"]["pageInfo"]["hasNextPage"]
    end

    test "blocks sensitive stack data nested under a policy" do
      policy = insert(:policy)
      insert(:stack_policy, policy: policy)

      {:ok, %{errors: [%{message: message} | _]}} = run_query("""
        query Policy($id: ID!) {
          policy(id: $id) {
            stackPolicies(first: 5) {
              edges { node { stack { runs(first: 5) { edges { node { id } } } } } }
            }
          }
        }
      """, %{"id" => policy.id}, %{current_user: admin_user()})

      assert message == "stack runs cannot be fetched through a policy"
    end

    test "blocks sensitive workbench data nested under a policy" do
      policy = insert(:policy)
      insert(:workbench_policy, policy: policy)

      {:ok, %{errors: [%{message: message} | _]}} = run_query("""
        query Policy($id: ID!) {
          policy(id: $id) {
            workbenchPolicies(first: 5) {
              edges { node { workbench { runs(first: 5) { edges { node { id } } } } } }
            }
          }
        }
      """, %{"id" => policy.id}, %{current_user: admin_user()})

      assert message == "workbench runs cannot be fetched through a policy"
    end

    test "blocks sensitive stack data nested under policy attachments" do
      policy = insert(:policy)
      insert(:stack_policy, policy: policy)

      {:ok, %{errors: [%{message: message} | _]}} = run_query("""
        query Policy($id: ID!) {
          policy(id: $id) {
            attachments(first: 5) {
              edges { node { stack { runs(first: 5) { edges { node { id } } } } } }
            }
          }
        }
      """, %{"id" => policy.id}, %{current_user: admin_user()})

      assert message == "stack runs cannot be fetched through a policy"
    end

    test "permits allowed stack and workbench fields nested under a policy" do
      policy = insert(:policy)
      stack_policy = insert(:stack_policy, policy: policy)
      workbench_policy = insert(:workbench_policy, policy: policy)

      {:ok, %{data: %{"policy" => found}}} = run_query("""
        query Policy($id: ID!) {
          policy(id: $id) {
            stackPolicies(first: 5) {
              edges { node { stack { id readBindings { id } } } }
            }
            workbenchPolicies(first: 5) {
              edges { node { workbench { id readBindings { id } } } }
            }
          }
        }
      """, %{"id" => policy.id}, %{current_user: admin_user()})

      [%{"node" => %{"stack" => stack}}] = found["stackPolicies"]["edges"]
      [%{"node" => %{"workbench" => workbench}}] = found["workbenchPolicies"]["edges"]

      assert stack["id"] == stack_policy.stack_id
      assert workbench["id"] == workbench_policy.workbench_id
    end

    test "permits nested stack and workbench data outside a policy query" do
      stack = insert(:stack)
      workbench = insert(:workbench)

      {:ok, %{data: %{"infrastructureStack" => stack_result, "workbench" => workbench_result}}} = run_query("""
        query Resources($stackId: ID!, $workbenchId: ID!) {
          infrastructureStack(id: $stackId) {
            runs(first: 5) { edges { node { id } } }
          }
          workbench(id: $workbenchId) {
            runs(first: 5) { edges { node { id } } }
          }
        }
      """, %{"stackId" => stack.id, "workbenchId" => workbench.id}, %{current_user: admin_user()})

      assert stack_result["runs"] == %{"edges" => []}
      assert workbench_result["runs"] == %{"edges" => []}
    end

    test "does not expose bindings through individual policies" do
      policy = insert(:policy)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Policy($id: ID!) {
          policy(id: $id) {
            bindingPolicies(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => policy.id}, %{current_user: admin_user()})
    end

    test "lists bindings for accessible policies" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      policy = insert(:policy, project: project)
      bind_policy = insert(:policy, project: project)
      binding = insert(:binding_policy, policy: policy, bind_policy: bind_policy, type: :stack)
      insert(:binding_policy)

      {:ok, %{data: %{"bindingPolicies" => found}}} = run_query("""
        query {
          bindingPolicies(first: 5) {
            edges { node { id type policy { id } } }
          }
        }
      """, %{}, %{current_user: user})

      [node] = from_connection(found)
      assert node["id"] == binding.id
      assert node["type"] == "STACK"
      assert node["policy"]["id"] == policy.id
    end

    test "lists bindings only when both child policies are accessible" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      inaccessible_project = insert(:project)

      visible = insert(:binding_policy,
        policy: insert(:policy, project: project),
        bind_policy: insert(:policy, project: project, type: :binding)
      )

      insert(:binding_policy,
        policy: insert(:policy, project: inaccessible_project),
        bind_policy: insert(:policy, project: project, type: :binding)
      )

      insert(:binding_policy,
        policy: insert(:policy, project: project),
        bind_policy: insert(:policy, project: inaccessible_project, type: :binding)
      )

      {:ok, %{data: %{"bindingPolicies" => found}}} = run_query("""
        query {
          bindingPolicies(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found) |> ids_equal([visible])
    end

    test "does not fetch bindings by id when either child policy is inaccessible" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      inaccessible_project = insert(:project)

      binding = insert(:binding_policy,
        policy: insert(:policy, project: project),
        bind_policy: insert(:policy, project: inaccessible_project, type: :binding)
      )

      {:ok, %{data: %{"bindingPolicy" => nil}, errors: [_ | _]}} = run_query("""
        query BindingPolicy($id: ID!) {
          bindingPolicy(id: $id) { id }
        }
      """, %{"id" => binding.id}, %{current_user: user})
    end
  end
end
