defmodule Console.Deployments.PolicyTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Policy
  alias Console.Schema.{BindingPolicy, PolicyConstraint, VulnerabilityReport}

  describe "create_policy/2" do
    test "project writers can create a policy" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, policy} = Policy.create_policy(%{
        name: "allow-workbench-tools",
        description: "Allows approved workbench tools",
        policy: "package workbench",
        project_id: project.id
      }, user)

      assert policy.project_id == project.id
      assert policy.name == "allow-workbench-tools"
    end

    test "project readers cannot create a policy" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])

      assert {:error, _} =
               Policy.create_policy(%{
                 name: "deny-workbench-tools",
                 policy: "package workbench",
                 project_id: project.id
               }, user)
    end
  end

  describe "update_policy/3" do
    test "project writers can update a policy" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      policy = insert(:policy, project: project)

      {:ok, updated} = Policy.update_policy(%{description: "Updated policy"}, policy.id, user)

      assert updated.description == "Updated policy"
    end

    test "project readers cannot update a policy" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      policy = insert(:policy, project: project)

      assert {:error, _} = Policy.update_policy(%{description: "Updated policy"}, policy.id, user)
      assert refetch(policy).description != "Updated policy"
    end
  end

  describe "delete_policy/2" do
    test "project writers can delete a policy" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      policy = insert(:policy, project: project)

      {:ok, deleted} = Policy.delete_policy(policy.id, user)

      assert deleted.id == policy.id
      refute refetch(policy)
    end

    test "project readers cannot delete a policy" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      policy = insert(:policy, project: project)

      assert {:error, _} = Policy.delete_policy(policy.id, user)
      assert refetch(policy)
    end
  end

  describe "binding policy CRUD" do
    test "policy writers can create, update, and delete bindings" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      policy = insert(:policy, project: project)
      bind_policy = insert(:policy, project: project, type: :binding)

      {:ok, binding} =
        Policy.create_binding_policy(
          %{policy_id: policy.id, bind_policy_id: bind_policy.id, type: :workbench, matches: %{workbench: %{regexes: ["^kubernetes\\."]}}},
          user
        )

      assert binding.policy_id == policy.id
      assert binding.bind_policy_id == bind_policy.id
      assert binding.matches.workbench.regexes == ["^kubernetes\\."]

      {:ok, updated} =
        Policy.update_binding_policy(
          %{type: :stack, matches: %{workbench: %{regexes: ["^terraform\\."]}}},
          binding.id,
          user
        )

      assert updated.type == :stack
      assert updated.matches.workbench.regexes == ["^terraform\\."]

      {:ok, deleted} = Policy.delete_binding_policy(updated.id, user)
      assert deleted.id == updated.id
      refute refetch(updated)
    end

    test "policy readers cannot manage bindings" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      policy = insert(:policy, project: project)
      bind_policy = insert(:policy, project: project, type: :binding)
      binding = insert(:binding_policy, policy: policy, bind_policy: bind_policy)

      assert {:error, _} = Policy.create_binding_policy(%{policy_id: policy.id, bind_policy_id: bind_policy.id, type: :stack}, user)
      assert {:error, _} = Policy.update_binding_policy(%{type: :stack}, binding.id, user)
      assert {:error, _} = Policy.delete_binding_policy(binding.id, user)
    end

    test "requires a binding policy to evaluate target bindings" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      policy = insert(:policy, project: project)
      invalid_bind_policy = insert(:policy, project: project)

      assert {:error, "the binding policy needs to have binding type"} =
               Policy.create_binding_policy(
                 %{policy_id: policy.id, bind_policy_id: invalid_bind_policy.id, type: :workbench},
                 user
               )
    end
  end

  describe "binding policy polling" do
    test "defaults to an hourly interval and immediately schedules new policies" do
      changeset = BindingPolicy.changeset(%BindingPolicy{}, %{policy_id: Ecto.UUID.generate(), bind_policy_id: Ecto.UUID.generate(), type: :workbench})

      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :interval) == "1h"
      assert Ecto.Changeset.get_field(changeset, :next_poll_at)
    end

    test "rejects intervals below thirty minutes" do
      changeset = BindingPolicy.changeset(
        %BindingPolicy{},
        %{policy_id: Ecto.UUID.generate(), bind_policy_id: Ecto.UUID.generate(), type: :workbench, interval: "29m"}
      )

      assert [interval: _] = Keyword.take(changeset.errors, [:interval])
    end

    test "accepts intervals of at least thirty minutes" do
      for interval <- ["30m", "6h"] do
        changeset =
          BindingPolicy.changeset(
            %BindingPolicy{},
            %{policy_id: Ecto.UUID.generate(), bind_policy_id: Ecto.UUID.generate(), type: :workbench, interval: interval}
          )

        assert changeset.valid?
      end
    end

    test "schedules the next poll using the configured interval" do
      now = DateTime.utc_now()
      changeset = BindingPolicy.next_poll_changeset(%BindingPolicy{}, "6h")
      next_poll_at = Ecto.Changeset.get_change(changeset, :next_poll_at)

      assert DateTime.diff(next_poll_at, now, :second) in (3 * 60 * 60)..(9 * 60 * 60)
    end

    test "only considers due bindings pollable" do
      due = insert(:binding_policy, next_poll_at: DateTime.add(DateTime.utc_now(), -1, :hour))
      insert(:binding_policy, next_poll_at: DateTime.add(DateTime.utc_now(), 1, :hour))

      assert ids_equal(Repo.all(BindingPolicy.pollable()), [due])
    end

    test "scopes binding policies to their base policy project" do
      project = insert(:project)
      binding = insert(:binding_policy, policy: insert(:policy, project: project))
      insert(:binding_policy)

      bindings =
        BindingPolicy
        |> BindingPolicy.for_type(:workbench)
        |> BindingPolicy.for_project(project.id)
        |> Repo.all()

      assert ids_equal(bindings, [binding])
    end

    test "adds and removes workbench policy bindings without duplicates" do
      insert(:user, bot_name: "console")
      project = insert(:project)
      workbench = insert(:workbench, project: project, name: "bound-workbench")
      retained = insert(:workbench, project: project, name: "retained-workbench")
      policy = insert(:policy, project: project)
      bind_policy = insert(:policy, project: project, type: :binding, policy: "package plrl.binding\nbind := true if input.workbench.name == \"bound-workbench\"")
      binding = insert(:binding_policy, policy: policy, bind_policy: bind_policy, matches: %{workbench: %{regexes: [".*"]}})

      :ok = Policy.reconcile(binding)
      :ok = Policy.reconcile(binding)

      assert 1 == Console.Schema.WorkbenchPolicy.for_workbench(workbench.id) |> Repo.aggregate(:count)

      insert(:workbench_policy, policy: policy, workbench: retained)

      {:ok, bind_policy} =
        Policy.update_policy(
          %{policy: "package plrl.binding\nbind := true if input.workbench.name == \"retained-workbench\""},
          bind_policy.id,
          admin_user()
        )

      :ok = Policy.reconcile(%{binding | bind_policy: bind_policy})

      assert 0 == Console.Schema.WorkbenchPolicy.for_workbench(workbench.id) |> Repo.aggregate(:count)
      assert 1 == Console.Schema.WorkbenchPolicy.for_workbench(retained.id) |> Repo.aggregate(:count)
    end

    test "pipeline handling always schedules the next poll" do
      binding = insert(:binding_policy, next_poll_at: DateTime.add(DateTime.utc_now(), -1, :hour))

      :ok = Console.Pipelines.BindingPolicy.Pipeline.handle_event(binding)

      assert Timex.after?(refetch(binding).next_poll_at, DateTime.utc_now())
    end

    test "adds and removes stack policy bindings" do
      insert(:user, bot_name: "console")
      project = insert(:project)
      stack = insert(:stack, project: project, name: "bound-stack")
      policy = insert(:policy, project: project, type: :stack)
      bind_policy =
        insert(:policy,
          project: project,
          type: :binding,
          policy: "package plrl.binding\nbind := true if input.stack.name == \"bound-stack\""
        )
      binding = insert(:binding_policy, policy: policy, bind_policy: bind_policy, type: :stack)

      :ok = Policy.reconcile(binding)
      assert 1 == Console.Schema.StackPolicy.for_stack(stack.id) |> Repo.aggregate(:count)

      {:ok, bind_policy} = Policy.update_policy(%{policy: "package plrl.binding\nbind := false"}, bind_policy.id, admin_user())
      :ok = Policy.reconcile(%{binding | bind_policy: bind_policy})

      assert 0 == Console.Schema.StackPolicy.for_stack(stack.id) |> Repo.aggregate(:count)
    end
  end

  describe "evaluate_policy/2" do
    test "evaluates stack approval policies with deny, defer, and approve" do
      policy = insert(:policy,
        type: :stack,
        policy: """
        package plrl.stack

        sample := 0

        deny[{"message": "blocked"}] if {
          input.action == "destroy"
        }

        defer if input.action == "wait"

        approve[{"reason": "safe"}] if {
          input.action == "apply"
        }
        """
      )

      {:ok, denied} = Policy.evaluate_policy(policy, %{"action" => "destroy"})
      assert [%{"message" => "blocked"}] = denied["deny"]
      refute denied["defer"]
      assert denied["approve"] == []

      {:ok, deferred} = Policy.evaluate_policy(policy, %{"action" => "wait"})
      assert deferred["deny"] == []
      assert deferred["defer"]
      assert deferred["approve"] == []

      {:ok, approved} = Policy.evaluate_policy(policy, %{"action" => "apply"})
      assert approved["deny"] == []
      refute approved["defer"]
      assert [%{"reason" => "safe"}] = approved["approve"]
    end

    test "returns empty deny/approve and false defer for a default stack policy" do
      policy = insert(:policy, type: :stack, policy: "package plrl.stack\nsample := 0")

      {:ok, result} = Policy.evaluate_policy(policy, %{})

      assert result["deny"] == []
      refute result["defer"]
      assert result["approve"] == []
      assert result["sample"] == 0
    end
  end

  describe "evaluate_custom_policy/3" do
    test "evaluates unsaved source without a stored policy" do
      {:ok, result} = Policy.evaluate_custom_policy(:workbench, """
        package plrl.wb.admission

        sample := 0

        deny[{"message": "buffer"}] if {
          true
        }
      """, %{})

      assert [%{"message" => "buffer"}] = result["deny"]
    end

    test "rejects invalid rego" do
      {:error, %Ecto.Changeset{} = changeset} =
        Policy.evaluate_custom_policy(:workbench, "package test\n\nallow {", %{})

      assert [message] = errors_on(changeset).policy
      assert message =~ "invalid rego policy"
    end

    test "rejects an empty buffer" do
      {:error, %Ecto.Changeset{} = changeset} =
        Policy.evaluate_custom_policy(:workbench, "", %{})

      assert [message] = errors_on(changeset).policy
      assert message =~ "invalid rego policy"
    end

    test "rejects source over 1MB" do
      {:error, %Ecto.Changeset{} = changeset} =
        Policy.evaluate_custom_policy(:workbench, String.duplicate("a", 1_000_001), %{})

      assert errors_on(changeset).policy == ["should be at most 1000000 character(s)"]
    end
  end

  describe "actor/1" do
    test "builds a cleaned actor payload from a user" do
      group = insert(:group, name: "admins")
      user = insert(:user, name: "Pat", email: "pat@example.com")
      insert(:group_member, group: group, user: user)
      user = Repo.preload(user, :groups)

      assert Policy.actor(user) == %{
        "id" => user.id,
        "name" => "Pat",
        "email" => "pat@example.com",
        "groups" => ["admins"]
      }
    end

    test "returns an empty map when no user is present" do
      assert Policy.actor(nil) == %{}
    end
  end

  describe "stack/1" do
    test "builds a cleaned stack payload with project and git information" do
      project = insert(:project, name: "infra")
      repo = insert(:git_repository, url: "https://github.com/acme/infra.git")
      stack = insert(:stack,
        name: "prod-network",
        project: project,
        repository: repo,
        git: %{ref: "main", folder: "terraform"},
        sha: "abc123"
      )

      assert Policy.stack(stack) == %{
        "name" => "prod-network",
        "project" => %{"id" => project.id, "name" => "infra"},
        "git" => %{
          "ref" => "main",
          "folder" => "terraform",
          "sha" => "abc123",
          "url" => "https://github.com/acme/infra.git"
        }
      }
    end

    test "returns an empty map when no stack is present" do
      assert Policy.stack(nil) == %{}
    end
  end

  describe "commit/1" do
    test "builds a cleaned commit payload from a stack run" do
      run = insert(:stack_run,
        git: %{ref: "abc123", folder: "terraform"},
        message: "add web instance",
        committer: "alice@example.com"
      )

      assert Policy.commit(run) == %{
        "sha" => "abc123",
        "message" => "add web instance",
        "committer" => "alice@example.com"
      }
    end

    test "returns an empty map when no run is present" do
      assert Policy.commit(nil) == %{}
    end
  end

  describe "policy_reason/2" do
    test "joins message and reason fields" do
      assert Policy.policy_reason([%{"message" => "blocked"}, %{"reason" => "safe"}]) ==
               "blocked; safe"
    end

    test "uses the fallback when there are no reasons" do
      assert Policy.policy_reason([], "denied by stack policy") == "denied by stack policy"
    end
  end

  describe "#upsert_vulnerabilities/2" do
    test "it can upsert vulnerabilities for a cluster" do
      cluster = insert(:cluster)
      svc     = insert(:service)

      attrs = %{
        artifact_url: "nginx:latest",
        os: %{eosl: false, family: "linux", name: "alpine"},
        summary: %{
          critical_count: 0,
          high_count:     1,
          medium_count:   0,
          low_count:      0,
          unknown_count:  0,
          none_count:     0
        },
        artifact: %{
          repository: "nginx",
          tag:        "latest"
        },
        services: [%{service_id: svc.id}],
        vulnerabilities: [%{
          resource:          "blah",
          fixed_version:     "1.2.0",
          installed_version: "1.1.0",
          severity:          :high,
          score:             8.0,
          cvss: %{redhat: %{v3_vector: "CVSS:3.1/AV:L/AC:L/PR:H/UI:N/S:C/C:H/I:N/A:N", v3_score: 6}},
          title:             "blah",
          description:       "blah",
          cvss_source:       "nvidia",
          primary_link:      "example.com",
          links:             []
        }]
      }

      {:ok, 1} = Policy.upsert_vulnerabilities([attrs], cluster)

      report = VulnerabilityReport.for_cluster(cluster.id)
               |> Repo.one()
               |> Repo.preload([:services, :vulnerabilities])

      assert report.artifact_url == "nginx:latest"
      refute report.os.eosl
      assert report.os.family == "linux"
      assert report.os.name == "alpine"
      assert report.updated_at

      assert report.summary.high_count == 1

      assert report.artifact.repository == "nginx"
      assert report.artifact.tag == "latest"

      [svc_vuln] = report.services

      assert svc_vuln.service_id == svc.id

      [vuln] = report.vulnerabilities

      assert vuln.resource == "blah"
      assert vuln.fixed_version == "1.2.0"
      assert vuln.installed_version == "1.1.0"
    end
  end

  describe "#upsert_constraints/2" do
    test "it can add constraints to the db for a cluster" do
      cluster = insert(:cluster)

      {:ok, 2} = Policy.upsert_constraints([
        %{
          name: "some-constraint",
          ref: %{kind: "K8sSomePolicy", name: "some-constraint"},
          violation_count: 0,
          violations: []
        },
        %{
          name: "other-constraint",
          ref: %{kind: "K8sSomePolicy", name: "other-constraint"},
          violation_count: 1,
          violations: [%{group: "apps", version: "v1", kind: "Deployment", namespace: "prod", name: "service", message: "this is bad"}]
        }
      ], cluster)

      constraints = PolicyConstraint.for_cluster(cluster.id)
                    |> Repo.all()
                    |> Repo.preload([:violations])

      assert length(constraints) == 2
      assert Enum.all?(constraints, & &1.updated_at)
      by_name = Map.new(constraints, & {&1.name, &1})

      assert length(by_name["other-constraint"].violations) == 1
      assert length(by_name["some-constraint"].violations) == 0
    end

    test "it can prune no longer used constraints" do
      cluster = insert(:cluster)
      keep = insert(:policy_constraint, cluster: cluster, name: "some-constraint")
      ignore = insert(:policy_constraint, cluster: cluster, name: "other-constraint")

      {:ok, _} = Policy.upsert_constraints([
        %{
          name: "some-constraint",
          ref: %{kind: "K8sSomePolicy", name: "some-constraint"},
          violation_count: 0,
          violations: []
        },
      ], cluster)

      assert refetch(ignore).updated_at == ignore.updated_at

      keep = refetch(keep)
      assert keep.ref.kind == "K8sSomePolicy"
      assert keep.ref.name == "some-constraint"
    end
  end
end
