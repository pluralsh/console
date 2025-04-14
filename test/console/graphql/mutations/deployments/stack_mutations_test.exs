defmodule Console.GraphQl.Deployments.StackMutationsTest do
  use Console.DataCase, async: true

  describe "createStack" do
    test "it can create a stack" do
      repo = insert(:git_repository)
      cluster = insert(:cluster)

      {:ok, %{data: %{"createStack" => found}}} = run_query("""
        mutation Create($attrs: StackAttributes!) {
          createStack(attributes: $attrs) {
            id
            name
            type
            cluster { id }
            repository { id }
            git { ref folder }
            configuration { version }
            environment { name value secret }
            files { path content }
          }
        }
      """, %{"attrs" => %{
        "name" => "some-stack",
        "type" => "TERRAFORM",
        "repositoryId" => repo.id,
        "clusterId" => cluster.id,
        "git" => %{"ref" => "main", "folder" => "terraform"},
        "configuration" => %{"version" => "1.7.0"},
        "environment" => [%{"secret" => true, "name" => "TEST_ENV_VAR", "value" => "dummy"}],
        "files" => [%{"path" => "test", "content" => "test"}]
      }}, %{current_user: admin_user()})

      assert found["id"]
      assert found["name"] == "some-stack"
      assert found["type"] == "TERRAFORM"
      assert found["repository"]["id"] == repo.id
      assert found["cluster"]["id"] == cluster.id
      assert found["git"]["ref"] == "main"
      assert found["git"]["folder"] == "terraform"
      assert found["configuration"]["version"] == "1.7.0"

      [env] = found["environment"]
      assert env["name"] == "TEST_ENV_VAR"
      assert env["value"] == "dummy"
      assert env["secret"]

      [file] = found["files"]
      assert file["path"] == "test"
      assert file["content"] == "test"
    end

    test "it can create a stack for a project" do
      project = insert(:project)
      repo = insert(:git_repository)
      cluster = insert(:cluster)

      {:ok, %{data: %{"createStack" => found}}} = run_query("""
        mutation Create($attrs: StackAttributes!) {
          createStack(attributes: $attrs) {
            id
            name
            type
            cluster { id }
            repository { id }
            git { ref folder }
            project { id name }
            configuration { version }
            environment { name value secret }
            files { path content }
          }
        }
      """, %{"attrs" => %{
        "name" => "some-stack",
        "type" => "TERRAFORM",
        "repositoryId" => repo.id,
        "clusterId" => cluster.id,
        "projectId" => project.id,
        "git" => %{"ref" => "main", "folder" => "terraform"},
        "configuration" => %{"version" => "1.7.0"},
        "environment" => [%{"secret" => true, "name" => "TEST_ENV_VAR", "value" => "dummy"}],
        "files" => [%{"path" => "test", "content" => "test"}]
      }}, %{current_user: admin_user()})

      assert found["id"]
      assert found["name"] == "some-stack"
      assert found["type"] == "TERRAFORM"
      assert found["repository"]["id"] == repo.id
      assert found["cluster"]["id"] == cluster.id
      assert found["project"]["id"] == project.id
      assert found["project"]["name"] == project.name
      assert found["git"]["ref"] == "main"
      assert found["git"]["folder"] == "terraform"
      assert found["configuration"]["version"] == "1.7.0"

      [env] = found["environment"]
      assert env["name"] == "TEST_ENV_VAR"
      assert env["value"] == "dummy"
      assert env["secret"]

      [file] = found["files"]
      assert file["path"] == "test"
      assert file["content"] == "test"
    end
  end

  describe "updateStack" do
    test "it can update a stack" do
      stack = insert(:stack)

      {:ok, %{data: %{"updateStack" => found}}} = run_query("""
        mutation Update($id: ID!, $attrs: StackAttributes!) {
          updateStack(id: $id, attributes: $attrs) {
            id
            name
            type
            cluster { id }
            repository { id }
            git { ref folder }
          }
        }
      """, %{"id" => stack.id, "attrs" => %{
        "name" => "some-stack",
        "type" => "TERRAFORM",
        "repositoryId" => stack.repository.id,
        "clusterId" => stack.cluster.id,
        "git" => %{"ref" => stack.git.ref, "folder" => stack.git.folder}
      }}, %{current_user: admin_user()})

      assert found["id"]
      assert found["name"] == "some-stack"
      assert found["type"] == "TERRAFORM"
      assert found["repository"]["id"] == stack.repository.id
      assert found["cluster"]["id"] == stack.cluster.id
    end
  end

  describe "detachStack" do
    test "it can detach a stack" do
      stack = insert(:stack)

      {:ok, %{data: %{"detachStack" => found}}} = run_query("""
        mutation Delete($id: ID!) {
          detachStack(id: $id) { id }
        }
      """, %{"id" => stack.id}, %{current_user: admin_user()})

      assert found["id"] == stack.id
    end
  end

  describe "deleteStack" do
    test "it can delete a stack" do
      stack = insert(:stack)

      {:ok, %{data: %{"deleteStack" => found}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteStack(id: $id) {
            id
            deletedAt
          }
        }
      """, %{"id" => stack.id}, %{current_user: admin_user()})

      assert found["id"] == stack.id
      assert found["deletedAt"]
    end
  end

  describe "restoreStack" do
    test "it can restore a stack from deletion" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}], deleted_at: Timex.now())
      run = insert(:stack_run, stack: stack, status: :pending_approval)
      {:ok, stack} = Console.Schema.Stack.delete_changeset(stack, %{delete_run_id: run.id})
                     |> Console.Repo.update()

      {:ok, %{data: %{"restoreStack" => restored}}} = run_query("""
        mutation Restore($id: ID!) {
          restoreStack(id: $id) {
            id
            deletedAt
            deleteRun { id }
          }
        }
      """, %{"id" => stack.id}, %{current_user: user})

      assert restored["id"] == stack.id
      refute restored["deletedAt"]
      refute restored["deleteRun"]

      assert refetch(run).status == :cancelled
    end
  end

  describe "approveStackRun" do
    test "it can approve a stack run" do
      run = insert(:stack_run)
      admin = admin_user()

      {:ok, %{data: %{"approveStackRun" => found}}} = run_query("""
        mutation Approve($id: ID!) {
          approveStackRun(id: $id) {
            id
            approvedAt
            approver { id name }
          }
        }
      """, %{"id" => run.id}, %{current_user: admin})

      assert found["id"] == run.id
      assert found["approvedAt"]
      assert found["approver"]["id"] == admin.id
      assert found["approver"]["name"] == admin.name
    end
  end

  describe "restartStackRun" do
    test "it can restart a stack run" do
      stack = insert(:stack,
        environment: [%{name: "ENV", value: "1"}],
        files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "terraform"},
        sha: "some-sha"
      )
      run = insert(:stack_run, git: %{ref: "some-sha"}, stack: stack)
      admin = admin_user()

      {:ok, %{data: %{"restartStackRun" => restarted}}} = run_query("""
        mutation Restart($id: ID!) {
          restartStackRun(id: $id) {
            id
            git { ref }
          }
        }
      """, %{"id" => run.id}, %{current_user: admin})

      refute restarted["id"] == run.id
      assert restarted["git"]["ref"] == "some-sha"
    end
  end

  describe "updateStackRun" do
    test "clusters can update stack runs" do
      run = insert(:stack_run)

      {:ok, %{data: %{"updateStackRun" => found}}} = run_query("""
        mutation Update($id: ID!, $attrs: StackRunAttributes!) {
          updateStackRun(id: $id, attributes: $attrs) {
            id
            status
          }
        }
      """, %{"id" => run.id, "attrs" => %{"status" => "RUNNING"}}, %{cluster: run.cluster})

      assert found["id"] == run.id
      assert found["status"] == "RUNNING"
    end
  end

  describe "completeStackRun" do
    test "clusters can complete stack runs" do
      run = insert(:stack_run)

      {:ok, %{data: %{"updateStackRun" => found}}} = run_query("""
        mutation Update($id: ID!, $attrs: StackRunAttributes!) {
          updateStackRun(id: $id, attributes: $attrs) {
            id
            status
          }
        }
      """, %{"id" => run.id, "attrs" => %{"status" => "SUCCESSFUL"}}, %{cluster: run.cluster})

      assert found["id"] == run.id
      assert found["status"] == "SUCCESSFUL"
    end
  end

  describe "updateRunStep" do
    test "clusters can update stack runs" do
      step = insert(:run_step)

      {:ok, %{data: %{"updateRunStep" => found}}} = run_query("""
        mutation Update($id: ID!, $attrs: RunStepAttributes!) {
          updateRunStep(id: $id, attributes: $attrs) {
            id
            status
          }
        }
      """, %{"id" => step.id, "attrs" => %{"status" => "RUNNING"}}, %{cluster: step.run.cluster})

      assert found["id"] == step.id
      assert found["status"] == "RUNNING"
    end
  end

  describe "addRunLogs" do
    test "a cluster can add logs" do
      step = insert(:run_step)

      {:ok, %{data: %{"addRunLogs" => found}}} = run_query("""
        mutation Add($id: ID!, $attrs: RunLogAttributes!) {
          addRunLogs(stepId: $id, attributes: $attrs) {
            id
            logs
          }
        }
      """, %{"id" => step.id, "attrs" => %{"logs" => "some logs"}}, %{cluster: step.run.cluster})

      assert found["logs"] == "some logs"
    end
  end

  describe "createCustomStackRun" do
    test "admins can create a custom stack run" do
      stack = insert(:stack)
      {:ok, %{data: %{"createCustomStackRun" => csr}}} = run_query("""
        mutation create($attrs: CustomStackRunAttributes!) {
          createCustomStackRun(attributes: $attrs) {
            id
            name
            commands { cmd args }
          }
        }
      """, %{"attrs" => %{
        "name" => "test",
        "stackId" => stack.id,
        "commands" => [%{"cmd" => "echo", "args" => ["Hello World!"]}]
      }}, %{current_user: admin_user()})

      assert csr["name"] == "test"
      [cmd] = csr["commands"]
      assert cmd["cmd"] == "echo"
      assert cmd["args"] == ["Hello World!"]
    end
  end

  describe "updateCustomStackRun" do
    test "admins can update a custom stack run" do
      csr = insert(:custom_stack_run)
      {:ok, %{data: %{"updateCustomStackRun" => csr}}} = run_query("""
        mutation update($id: ID!, $attrs: CustomStackRunAttributes!) {
          updateCustomStackRun(id: $id, attributes: $attrs) {
            id
            name
            commands { cmd args }
          }
        }
      """, %{"id" => csr.id, "attrs" => %{
        "name" => "test",
        "commands" => [%{"cmd" => "echo", "args" => ["Hello World!"]}]
      }}, %{current_user: admin_user()})

      assert csr["name"] == "test"
      [cmd] = csr["commands"]
      assert cmd["cmd"] == "echo"
      assert cmd["args"] == ["Hello World!"]
    end
  end

  describe "deleteCustomStackRun" do
    test "it can delete a csr" do
      csr = insert(:custom_stack_run)
      {:ok, %{data: %{"deleteCustomStackRun" => found}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteCustomStackRun(id: $id) { id }
        }
      """, %{"id" => csr.id}, %{current_user: admin_user()})

      assert found["id"] == csr.id

      refute refetch(csr)
    end
  end

  describe "createStackDefinition" do
    test "admins can create a custom stack run" do
      {:ok, %{data: %{"createStackDefinition" => def}}} = run_query("""
        mutation create($attrs: StackDefinitionAttributes!) {
          createStackDefinition(attributes: $attrs) {
            id
            name
            configuration { image tag }
            steps { cmd args stage }
          }
        }
      """, %{"attrs" => %{
        "name" => "test",
        "configuration" => %{"image" => "some/image", "tag" => "0.1.0"},
        "steps" => [%{"cmd" => "echo", "args" => ["Hello World!"], "stage" => "APPLY"}]
      }}, %{current_user: admin_user()})

      assert def["name"] == "test"
      assert def["configuration"]["image"] == "some/image"
      assert def["configuration"]["tag"] == "0.1.0"
      [cmd] = def["steps"]
      assert cmd["cmd"] == "echo"
      assert cmd["args"] == ["Hello World!"]
      assert cmd["stage"] == "APPLY"
    end
  end

  describe "updateStackDefinition" do
    test "admins can update a custom stack run" do
      def = insert(:stack_definition)
      {:ok, %{data: %{"updateStackDefinition" => def}}} = run_query("""
        mutation update($id: ID!, $attrs: StackDefinitionAttributes!) {
          updateStackDefinition(id: $id, attributes: $attrs) {
            id
            name
            steps { cmd args stage }
          }
        }
      """, %{"id" => def.id, "attrs" => %{
        "name" => "test",
        "steps" => [%{"cmd" => "echo", "args" => ["Hello World!"], "stage" => "APPLY"}]
      }}, %{current_user: admin_user()})

      assert def["name"] == "test"
      [cmd] = def["steps"]
      assert cmd["cmd"] == "echo"
      assert cmd["args"] == ["Hello World!"]
      assert cmd["stage"] == "APPLY"
    end
  end

  describe "deleteStackDefinition" do
    test "it can delete a csr" do
      def = insert(:stack_definition)
      {:ok, %{data: %{"deleteStackDefinition" => found}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteStackDefinition(id: $id) { id }
        }
      """, %{"id" => def.id}, %{current_user: admin_user()})

      assert found["id"] == def.id

      refute refetch(def)
    end
  end

  describe "triggerRun" do
    test "admins can trigger a new run for a stack" do
      stack = insert(:stack,  git: %{ref: "main", folder: "terraform"})
      run = insert(:stack_run, stack: stack, git: %{ref: "some-sha"})

      {:ok, %{data: %{"triggerRun" => triggered}}} = run_query("""
        mutation Trigger($id: ID!) {
          triggerRun(id: $id) {
            id
            git { ref }
          }
        }
      """, %{"id" => stack.id}, %{current_user: admin_user()})

      assert triggered["id"]
      assert triggered["git"]["ref"] == run.git.ref
    end
  end

  describe "onDemandRun" do
    test "it can create a custom run" do
      stack = insert(:stack, sha: "test-sha")

      {:ok, %{data: %{"onDemandRun" => run}}} = run_query("""
        mutation Create($id: ID!, $cmds: [CommandAttributes]) {
          onDemandRun(stackId: $id, commands: $cmds) {
            id
            steps { cmd args }
            git { ref folder }
          }
        }
      """, %{"id" => stack.id, "cmds" => %{"cmd" => "echo", "args" => ["Hello World!"]}}, %{current_user: admin_user()})

      assert run["git"]["ref"] == "test-sha"
      assert run["git"]["folder"] == stack.git.folder

      [step] = run["steps"]
      assert step["cmd"] == "echo"
      assert step["args"] == ["Hello World!"]
    end
  end
end
