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
          }
        }
      """, %{"attrs" => %{
        "name" => "some-stack",
        "type" => "TERRAFORM",
        "repositoryId" => repo.id,
        "clusterId" => cluster.id,
        "git" => %{"ref" => "main", "folder" => "terraform"},
        "configuration" => %{"version" => "1.7.0"}
      }}, %{current_user: admin_user()})

      assert found["id"]
      assert found["name"] == "some-stack"
      assert found["type"] == "TERRAFORM"
      assert found["repository"]["id"] == repo.id
      assert found["cluster"]["id"] == cluster.id
      assert found["git"]["ref"] == "main"
      assert found["git"]["folder"] == "terraform"
      assert found["configuration"]["version"] == "1.7.0"
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
            configuration { version }
          }
        }
      """, %{"id" => stack.id, "attrs" => %{
        "name" => "some-stack",
        "type" => "TERRAFORM",
        "repositoryId" => stack.repository.id,
        "clusterId" => stack.cluster.id,
        "git" => %{"ref" => "main", "folder" => "terraform"},
        "configuration" => %{"version" => "1.7.0"}
      }}, %{current_user: admin_user()})

      assert found["id"]
      assert found["name"] == "some-stack"
      assert found["type"] == "TERRAFORM"
      assert found["repository"]["id"] == stack.repository.id
      assert found["cluster"]["id"] == stack.cluster.id
      assert found["git"]["ref"] == "main"
      assert found["git"]["folder"] == "terraform"
      assert found["configuration"]["version"] == "1.7.0"
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

  describe "approveStackRun" do
    test "it can approve a stack run" do
      run = insert(:stack_run)
      admin = admin_user()

      {:ok, %{data: %{"approveStackRun" => found}}} = run_query("""
        mutation Approve($id: ID!) {
          approveStackRun(id: $id) {
            id
            approvedAt
            approver { id }
          }
        }
      """, %{"id" => run.id}, %{current_user: admin})

      assert found["id"] == run.id
      assert found["approvedAt"]
      assert found["approver"]["id"] == admin.id
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
end
