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

    test "it can fetch workbench crons" do
      workbench = insert(:workbench)
      cron1 = insert(:workbench_cron, workbench: workbench, crontab: "*/5 * * * *", prompt: "run 1")
      cron2 = insert(:workbench_cron, workbench: workbench, crontab: "0 * * * *", prompt: "run 2")

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            crons(first: 5) {
              edges {
                node {
                  id
                  crontab
                  prompt
                  nextRunAt
                }
              }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      nodes = from_connection(found["crons"])
      assert ids_equal(nodes, [cron1, cron2])
      assert Enum.any?(nodes, & &1["crontab"] == "*/5 * * * *" and &1["prompt"] == "run 1")
    end

    test "it can fetch workbench prompts" do
      workbench = insert(:workbench)
      p1 = insert(:workbench_prompt, workbench: workbench, prompt: "first")
      p2 = insert(:workbench_prompt, workbench: workbench, prompt: "second")

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            prompts(first: 5) {
              edges {
                node {
                  id
                  prompt
                }
              }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      nodes = from_connection(found["prompts"])
      assert ids_equal(nodes, [p1, p2])
      assert Enum.any?(nodes, & &1["prompt"] == "first")
      assert Enum.any?(nodes, & &1["prompt"] == "second")
    end

    test "it can fetch workbench skills" do
      workbench = insert(:workbench)
      s1 = insert(:workbench_skill, workbench: workbench, name: "skill-one", description: "first", contents: "echo one")
      s2 = insert(:workbench_skill, workbench: workbench, name: "skill-two", description: "second", contents: "echo two")

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            workbenchSkills(first: 5) {
              edges {
                node {
                  id
                  name
                  description
                  contents
                }
              }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      nodes = from_connection(found["workbenchSkills"])
      assert ids_equal(nodes, [s1, s2])
      assert Enum.any?(nodes, & &1["name"] == "skill-one" and &1["description"] == "first" and &1["contents"] == "echo one")
      assert Enum.any?(nodes, & &1["name"] == "skill-two" and &1["description"] == "second" and &1["contents"] == "echo two")
    end

    test "it can fetch workbench webhooks" do
      workbench = insert(:workbench)
      webhook1 = insert(:workbench_webhook, workbench: workbench, name: "wh-one")
      webhook2 = insert(:workbench_webhook, workbench: workbench, name: "wh-two")

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            webhooks(first: 5) {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      nodes = from_connection(found["webhooks"])
      assert ids_equal(nodes, [webhook1, webhook2])
    end

    test "it can fetch workbench webhooks with issue webhook association" do
      workbench = insert(:workbench)
      issue_wh = insert(:issue_webhook, name: "linear-issues")
      wb_webhook = insert(:workbench_webhook, workbench: workbench, name: "wh-issue", issue_webhook: issue_wh)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            webhooks(first: 5) {
              edges {
                node {
                  id
                  name
                  issueWebhook { id name }
                }
              }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      nodes = from_connection(found["webhooks"])
      assert length(nodes) == 1
      node = hd(nodes)
      assert node["id"] == wb_webhook.id
      assert node["name"] == "wh-issue"
      assert node["issueWebhook"]["id"] == issue_wh.id
      assert node["issueWebhook"]["name"] == "linear-issues"
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

    test "it can fetch workbench alerts" do
      workbench = insert(:workbench)
      alerts = insert_list(3, :alert, workbench: workbench, project: workbench.project)
      insert_list(2, :alert, project: workbench.project)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            alerts(first: 5) {
              edges { node { id title state } }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      assert from_connection(found["alerts"])
             |> ids_equal(alerts)
    end

    test "it can fetch workbench issues" do
      workbench = insert(:workbench)
      issues = insert_list(3, :issue, workbench: workbench)
      insert_list(2, :issue, workbench: insert(:workbench))

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            issues(first: 5) {
              edges { node { id title status } }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      assert from_connection(found["issues"])
             |> ids_equal(issues)
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

  describe "workbenchJobActivity" do
    test "it can fetch a workbench job activity by id" do
      activity =
        insert(:workbench_job_activity,
          workbench_job: insert(:workbench_job),
          type: :coding,
          status: :running,
          prompt: "fix the bug"
        )

      {:ok, %{data: %{"workbenchJobActivity" => found}}} = run_query("""
        query WorkbenchJobActivity($id: ID!) {
          workbenchJobActivity(id: $id) {
            id
            status
            type
            prompt
          }
        }
      """, %{"id" => activity.id}, %{current_user: admin_user()})

      assert found["id"] == activity.id
      assert found["status"] == "RUNNING"
      assert found["type"] == "CODING"
      assert found["prompt"] == "fix the bug"
    end

    test "users with read access to the workbench can fetch workbench job activities" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      job = insert(:workbench_job, workbench: workbench)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :plan)

      {:ok, %{data: %{"workbenchJobActivity" => found}}} = run_query("""
        query WorkbenchJobActivity($id: ID!) {
          workbenchJobActivity(id: $id) {
            id
          }
        }
      """, %{"id" => activity.id}, %{current_user: user})

      assert found["id"] == activity.id
    end

    test "users without read access cannot fetch workbench job activities" do
      user = insert(:user)
      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench)
      activity = insert(:workbench_job_activity, workbench_job: job)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query WorkbenchJobActivity($id: ID!) {
          workbenchJobActivity(id: $id) {
            id
          }
        }
      """, %{"id" => activity.id}, %{current_user: user})
    end

    test "it can fetch embedded result on a workbench job activity" do
      job = insert(:workbench_job)

      activity =
        insert(:workbench_job_activity,
          workbench_job: job,
          type: :coding,
          result: %{
            output: "done",
            job_update: %{diff: "a -> b", working_theory: "theory", conclusion: "ok"}
          }
        )

      {:ok, %{data: %{"workbenchJobActivity" => found}}} = run_query("""
        query WorkbenchJobActivity($id: ID!) {
          workbenchJobActivity(id: $id) {
            id
            result {
              output
              jobUpdate {
                diff
                workingTheory
                conclusion
              }
            }
          }
        }
      """, %{"id" => activity.id}, %{current_user: admin_user()})

      assert found["id"] == activity.id
      assert found["result"]["output"] == "done"
      assert found["result"]["jobUpdate"]["diff"] == "a -> b"
      assert found["result"]["jobUpdate"]["workingTheory"] == "theory"
      assert found["result"]["jobUpdate"]["conclusion"] == "ok"
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

  describe "workbenchAlerts" do
    test "user only sees alerts for workbenches they have access to" do
      user      = insert(:user)
      project   = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      alerts    = insert_list(2, :alert, workbench: workbench, project: project)

      other_project = insert(:project)
      other_workbench = insert(:workbench, project: other_project)
      insert_list(3, :alert, workbench: other_workbench, project: other_project)

      {:ok, %{data: %{"workbenchAlerts" => found}}} = run_query("""
        query {
          workbenchAlerts(first: 10) {
            edges { node { id title } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(alerts)
    end

    test "user with no workbench access sees no alerts" do
      user = insert(:user)
      project = insert(:project)
      workbench = insert(:workbench, project: project)
      insert_list(2, :alert, workbench: workbench, project: project)

      {:ok, %{data: %{"workbenchAlerts" => found}}} = run_query("""
        query {
          workbenchAlerts(first: 10) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> Enum.empty?()
    end
  end

  describe "workbenchIssues" do
    test "user only sees issues for workbenches they have access to" do
      user      = insert(:user)
      project   = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      issues    = insert_list(2, :issue, workbench: workbench)

      other_project = insert(:project)
      other_workbench = insert(:workbench, project: other_project)
      insert_list(3, :issue, workbench: other_workbench)

      {:ok, %{data: %{"workbenchIssues" => found}}} = run_query("""
        query {
          workbenchIssues(first: 10) {
            edges { node { id title } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(issues)
    end

    test "user with no workbench access sees no issues" do
      user = insert(:user)
      project = insert(:project)
      workbench = insert(:workbench, project: project)
      insert_list(2, :issue, workbench: workbench)

      {:ok, %{data: %{"workbenchIssues" => found}}} = run_query("""
        query {
          workbenchIssues(first: 10) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> Enum.empty?()
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
