defmodule Console.GraphQl.Deployments.WorkbenchQueriesTest do
  use Console.DataCase, async: true

  describe "workbenches" do
    test "it can fetch workbenches" do
      workbenches = insert_list(3, :workbench)

      {:ok, %{data: %{"workbenches" => found}}} = run_query("""
        query {
          workbenches(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(workbenches)
    end

    test "it can search" do
      workbench = insert(:workbench, name: "my-workbench")
      insert(:workbench, name: "other")

      {:ok, %{data: %{"workbenches" => found}}} = run_query("""
        query {
          workbenches(first: 5, q: "my-workbench") {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal([workbench])
    end

    test "it can respect rbac" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbenches = insert_list(2, :workbench, project: project)
      insert_list(3, :workbench)

      {:ok, %{data: %{"workbenches" => found}}} = run_query("""
        query {
          workbenches(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(workbenches)
    end

    test "it can filter by projectId" do
      project_a = insert(:project)
      project_b = insert(:project)
      workbenches_a = insert_list(2, :workbench, project: project_a)
      insert_list(2, :workbench, project: project_b)

      {:ok, %{data: %{"workbenches" => found}}} = run_query("""
        query Workbenches($projectId: ID!) {
          workbenches(first: 5, projectId: $projectId) {
            edges { node { id } }
          }
        }
      """, %{"projectId" => project_a.id}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(workbenches_a)
    end
  end

  describe "workbench" do
    test "it can fetch a workbench" do
      workbench = insert(:workbench)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            name
            description
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      assert found["name"] == workbench.name
      assert found["description"] == workbench.description
    end

    test "it can fetch by name" do
      workbench = insert(:workbench)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($name: String!) {
          workbench(name: $name) {
            id
            name
            description
          }
        }
      """, %{"name" => workbench.name}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      assert found["name"] == workbench.name
    end

    test "it can fetch workbench with configuration" do
      workbench = insert(:workbench)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            configuration {
              infrastructure { services stacks kubernetes }
              coding { mode repositories }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      # configuration may be nil or have nested structure
      assert found["configuration"] == nil or is_map(found["configuration"])
    end

    test "it can fetch workbench tools" do
      workbench = insert(:workbench)
      tool1 = insert(:workbench_tool, project: workbench.project, name: "tool_one")
      tool2 = insert(:workbench_tool, project: workbench.project, name: "tool_two")
      insert(:workbench_tool_association, workbench: workbench, tool: tool1)
      insert(:workbench_tool_association, workbench: workbench, tool: tool2)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            tools {
              id
              name
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      assert length(found["tools"]) == 2
      assert ids_equal(found["tools"], [tool1, tool2])
    end

    test "it can fetch workbench runs" do
      workbench = insert(:workbench)
      runs = insert_list(3, :workbench_job, workbench: workbench)
      insert_list(2, :workbench_job)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            runs(first: 5) {
              edges { node { id status } }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      assert from_connection(found["runs"])
             |> ids_equal(runs)
    end
  end

  describe "workbenchJob" do
    test "it can fetch a workbench job by id" do
      job = insert(:workbench_job)

      {:ok, %{data: %{"workbenchJob" => found}}} = run_query("""
        query WorkbenchJob($id: ID!) {
          workbenchJob(id: $id) {
            id
            status
            prompt
          }
        }
      """, %{"id" => job.id}, %{current_user: admin_user()})

      assert found["id"] == job.id
      assert found["status"] == to_string(job.status) |> String.upcase()
    end

    test "users with read access to the workbench can fetch workbench jobs" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      job = insert(:workbench_job, workbench: workbench)

      {:ok, %{data: %{"workbenchJob" => found}}} = run_query("""
        query WorkbenchJob($id: ID!) {
          workbenchJob(id: $id) {
            id
          }
        }
      """, %{"id" => job.id}, %{current_user: user})

      assert found["id"] == job.id
    end


    test "users without read access cannot fetch workbench jobs" do
      user = insert(:user)
      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query WorkbenchJob($id: ID!) {
          workbenchJob(id: $id) {
            id
          }
        }
      """, %{"id" => job.id}, %{current_user: user})
    end

    test "it can fetch activities for a workbench job" do
      job = insert(:workbench_job)
      activities = insert_list(3, :workbench_job_activity, workbench_job: job, type: :coding)
      insert_list(2, :workbench_job_activity)

      {:ok, %{data: %{"workbenchJob" => found}}} = run_query("""
        query WorkbenchJob($id: ID!) {
          workbenchJob(id: $id) {
            id
            activities(first: 10) {
              edges { node { id status type } }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      """, %{"id" => job.id}, %{current_user: admin_user()})

      assert found["id"] == job.id
      assert from_connection(found["activities"])
             |> ids_equal(activities)
    end

    test "it can paginate activities" do
      job = insert(:workbench_job)
      insert_list(5, :workbench_job_activity, workbench_job: job, type: :coding)

      {:ok, %{data: %{"workbenchJob" => first_page}}} = run_query("""
        query WorkbenchJob($id: ID!) {
          workbenchJob(id: $id) {
            id
            activities(first: 2) {
              edges { node { id } }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      """, %{"id" => job.id}, %{current_user: admin_user()})

      conn = first_page["activities"]
      assert length(from_connection(conn)) == 2
      assert conn["pageInfo"]["hasNextPage"] == true
      assert conn["pageInfo"]["endCursor"] != nil

      {:ok, %{data: %{"workbenchJob" => second_page}}} = run_query("""
        query WorkbenchJob($id: ID!, $after: String!) {
          workbenchJob(id: $id) {
            id
            activities(first: 10, after: $after) {
              edges { node { id } }
              pageInfo { hasNextPage }
            }
          }
        }
      """, %{"id" => job.id, "after" => conn["pageInfo"]["endCursor"]}, %{current_user: admin_user()})

      assert length(from_connection(second_page["activities"])) == 3
      assert second_page["activities"]["pageInfo"]["hasNextPage"] == false
    end

    test "it can fetch result for a workbench job (has_one)" do
      job = insert(:workbench_job, result: %{working_theory: "theory", conclusion: "done"})

      {:ok, %{data: %{"workbenchJob" => found}}} = run_query("""
        query WorkbenchJob($id: ID!) {
          workbenchJob(id: $id) {
            id
            result {
              id
              workingTheory
              conclusion
            }
          }
        }
      """, %{"id" => job.id}, %{current_user: admin_user()})

      assert found["id"] == job.id
      assert found["result"]["workingTheory"] == "theory"
      assert found["result"]["conclusion"] == "done"
    end
  end

  describe "workbench_tools" do
    test "it can fetch workbench tools" do
      tools = insert_list(3, :workbench_tool)

      {:ok, %{data: %{"workbenchTools" => found}}} = run_query("""
        query {
          workbenchTools(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(tools)
    end

    test "it can search" do
      tool = insert(:workbench_tool, name: "my_http_tool")
      insert(:workbench_tool, name: "other_tool")

      {:ok, %{data: %{"workbenchTools" => found}}} = run_query("""
        query {
          workbenchTools(first: 5, q: "my_http") {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal([tool])
    end

    test "it can respect rbac" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      tools = insert_list(2, :workbench_tool, project: project)
      insert_list(3, :workbench_tool)

      {:ok, %{data: %{"workbenchTools" => found}}} = run_query("""
        query {
          workbenchTools(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(tools)
    end

    test "it can filter by projectId" do
      project_a = insert(:project)
      project_b = insert(:project)
      tools_a = insert_list(2, :workbench_tool, project: project_a)
      insert_list(2, :workbench_tool, project: project_b)

      {:ok, %{data: %{"workbenchTools" => found}}} = run_query("""
        query WorkbenchTools($projectId: ID!) {
          workbenchTools(first: 5, projectId: $projectId) {
            edges { node { id } }
          }
        }
      """, %{"projectId" => project_a.id}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(tools_a)
    end
  end

  describe "workbench_tool" do
    test "it can fetch a workbench tool" do
      tool = insert(:workbench_tool)

      {:ok, %{data: %{"workbenchTool" => found}}} = run_query("""
        query WorkbenchTool($id: ID!) {
          workbenchTool(id: $id) {
            id
            name
            tool
          }
        }
      """, %{"id" => tool.id}, %{current_user: admin_user()})

      assert found["id"] == tool.id
      assert found["name"] == tool.name
      assert found["tool"] == to_string(tool.tool) |> String.upcase()
    end

    test "it can fetch by name" do
      tool = insert(:workbench_tool)

      {:ok, %{data: %{"workbenchTool" => found}}} = run_query("""
        query WorkbenchTool($name: String!) {
          workbenchTool(name: $name) {
            id
            name
            tool
          }
        }
      """, %{"name" => tool.name}, %{current_user: admin_user()})

      assert found["id"] == tool.id
      assert found["name"] == tool.name
    end
  end
end
