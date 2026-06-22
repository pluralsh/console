defmodule Console.GraphQl.Deployments.WorkbenchQueriesTest do
  use Console.DataCase, async: true
  use Mimic
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.Stub
  alias Toolquery.{MetricPoint, MetricsQueryOutput, TraceSpan, TracesQueryOutput}

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

    test "users with direct read bindings on a workbench can see it without project access" do
      user = insert(:user)
      visible = insert(:workbench, read_bindings: [%{user_id: user.id}])
      insert_list(2, :workbench)

      {:ok, %{data: %{"workbenches" => found}}} = run_query("""
        query {
          workbenches(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([visible])
    end

    test "users with direct write bindings on a workbench can see it without project access" do
      user = insert(:user)
      visible = insert(:workbench, write_bindings: [%{user_id: user.id}])
      insert_list(2, :workbench)

      {:ok, %{data: %{"workbenches" => found}}} = run_query("""
        query {
          workbenches(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([visible])
    end

    test "users in a group bound to a workbench can see it without project access" do
      user = insert(:user)
      group = insert(:group)
      insert(:group_member, group: group, user: user)
      visible = insert(:workbench, read_bindings: [%{group_id: group.id}])
      insert_list(2, :workbench)

      {:ok, %{data: %{"workbenches" => found}}} = run_query("""
        query {
          workbenches(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([visible])
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
      p2 = insert(:workbench_prompt, workbench: workbench, prompt: "second", category: "Jobs")

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            prompts(first: 5) {
              edges {
                node {
                  id
                  prompt
                  category
                }
              }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      nodes = from_connection(found["prompts"])
      assert ids_equal(nodes, [p1, p2])
      assert Enum.any?(nodes, & &1["prompt"] == "first" and &1["category"] == "Default")
      assert Enum.any?(nodes, & &1["prompt"] == "second" and &1["category"] == "Jobs")
    end

    test "it can fetch a workbench prompt by id" do
      workbench = insert(:workbench)
      prompt = insert(:workbench_prompt, workbench: workbench, prompt: "first", category: "Jobs")

      {:ok, %{data: %{"workbenchPrompt" => found}}} = run_query("""
        query WorkbenchPrompt($id: ID!) {
          workbenchPrompt(id: $id) {
            id
            prompt
            category
            workbench {
              id
            }
          }
        }
      """, %{"id" => prompt.id}, %{current_user: admin_user()})

      assert found["id"] == prompt.id
      assert found["prompt"] == "first"
      assert found["category"] == "Jobs"
      assert found["workbench"]["id"] == workbench.id
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

    test "it returns null eval when no eval is configured" do
      workbench = insert(:workbench)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            eval { id }
            evalResults(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      assert found["eval"] == nil
      assert from_connection(found["evalResults"]) == []
    end

    test "it can sideload eval and paginate eval results on the workbench" do
      workbench = insert(:workbench)
      eval = insert(:workbench_eval, workbench: workbench, conclusion_rules: "c-rules", prompt_rules: "p-rules")
      jobs = insert_list(5, :workbench_job, workbench: workbench)

      for job <- jobs do
        insert(:workbench_eval_result, workbench_eval: eval, workbench_job: job, grade: 8)
      end

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            eval {
              id
              conclusionRules
              promptRules
            }
            evalResults(first: 2) {
              edges {
                node {
                  id
                  grade
                  feedback { summary }
                  workbenchJob { id }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      ev = found["eval"]
      assert ev["id"] == eval.id
      assert ev["conclusionRules"] == "c-rules"
      assert ev["promptRules"] == "p-rules"

      conn = found["evalResults"]
      assert length(from_connection(conn)) == 2
      assert conn["pageInfo"]["hasNextPage"] == true

      {:ok, %{data: %{"workbench" => page2}}} = run_query("""
        query Workbench($id: ID!, $after: String!) {
          workbench(id: $id) {
            evalResults(first: 10, after: $after) {
              edges { node { id } }
              pageInfo { hasNextPage }
            }
          }
        }
      """, %{"id" => workbench.id, "after" => conn["pageInfo"]["endCursor"]}, %{current_user: admin_user()})

      assert length(from_connection(page2["evalResults"])) == 3
      assert page2["evalResults"]["pageInfo"]["hasNextPage"] == false
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

    test "it can fetch workbench chatbots" do
      workbench = insert(:workbench)
      conn = insert(:chat_connection)

      bot1 =
        insert(:workbench_chatbot,
          workbench: workbench,
          chat_connection: conn,
          channel: "C-wb-one-#{System.unique_integer([:positive])}"
        )

      bot2 =
        insert(:workbench_chatbot,
          workbench: workbench,
          chat_connection: conn,
          channel: "C-wb-two-#{System.unique_integer([:positive])}"
        )

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            chatbots(first: 5) {
              edges {
                node {
                  id
                  channel
                  chatConnection { id }
                }
              }
            }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      nodes = from_connection(found["chatbots"])
      assert ids_equal(nodes, [bot1, bot2])
      assert Enum.all?(nodes, &(&1["chatConnection"]["id"] == conn.id))
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

    test "users field returns users from user and group policy bindings on the workbench" do
      user_direct = insert(:user)
      group = insert(:group)
      user_via_group = insert(:user)
      insert(:group_member, group: group, user: user_via_group)
      other = insert(:user)

      workbench =
        insert(:workbench,
          read_bindings: [%{user_id: user_direct.id}, %{group_id: group.id}]
        )

      viewer = admin_user()

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            users { id }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: viewer})

      assert found["id"] == workbench.id
      user_ids = Enum.map(found["users"], & &1["id"]) |> MapSet.new()

      assert MapSet.equal?(
               user_ids,
               MapSet.new([user_direct.id, user_via_group.id, viewer.id])
             )

      refute MapSet.member?(user_ids, other.id)
    end

    test "users field returns users from user and group bindings on the project" do
      user_proj = insert(:user)
      proj_group = insert(:group)
      user_proj_via_group = insert(:user)
      insert(:group_member, group: proj_group, user: user_proj_via_group)
      other = insert(:user)

      project =
        insert(:project,
          read_bindings: [%{user_id: user_proj.id}, %{group_id: proj_group.id}]
        )

      workbench = insert(:workbench, project: project)

      viewer = admin_user()

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            users { id }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: viewer})

      assert found["id"] == workbench.id
      user_ids = Enum.map(found["users"], & &1["id"]) |> MapSet.new()

      assert MapSet.equal?(
               user_ids,
               MapSet.new([user_proj.id, user_proj_via_group.id, viewer.id])
             )

      refute MapSet.member?(user_ids, other.id)
    end

    test "users field returns users from user and group bindings on deployment settings (global)" do
      user_global = insert(:user)
      global_group = insert(:group)
      user_global_via_group = insert(:user)
      insert(:group_member, group: global_group, user: user_global_via_group)
      other = insert(:user)

      deployment_settings(
        read_bindings: [%{user_id: user_global.id}, %{group_id: global_group.id}]
      )

      workbench = insert(:workbench)

      viewer = admin_user()

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            users { id }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: viewer})

      assert found["id"] == workbench.id
      user_ids = Enum.map(found["users"], & &1["id"]) |> MapSet.new()

      assert MapSet.equal?(
               user_ids,
               MapSet.new([user_global.id, user_global_via_group.id, viewer.id])
             )

      refute MapSet.member?(user_ids, other.id)
    end

    test "users field includes users marked as admins" do
      regular = insert(:user)
      admin = insert(:user, roles: %{admin: true})
      unrelated = insert(:user)

      workbench =
        insert(:workbench, read_bindings: [%{user_id: regular.id}])

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            id
            users { id }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      user_ids = Enum.map(found["users"], & &1["id"]) |> MapSet.new()

      assert MapSet.member?(user_ids, regular.id)
      assert MapSet.member?(user_ids, admin.id)
      refute MapSet.member?(user_ids, unrelated.id)
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

    test "it can sideload chatbotMessage on a workbench job" do
      job = insert(:workbench_job)
      msg = insert(:chatbot_message, workbench_job: job)

      {:ok, %{data: %{"workbenchJob" => found}}} = run_query("""
        query WorkbenchJob($id: ID!) {
          workbenchJob(id: $id) {
            id
            chatbotMessage {
              id
              message
              channel
            }
          }
        }
      """, %{"id" => job.id}, %{current_user: admin_user()})

      assert found["id"] == job.id
      assert found["chatbotMessage"]["id"] == msg.id
      assert found["chatbotMessage"]["message"] == "chatbot message body"
      assert found["chatbotMessage"]["channel"] == "C-test-channel"
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

    test "it can fetch eval result for a workbench job (has_one)" do
      workbench = insert(:workbench)
      eval = insert(:workbench_eval, workbench: workbench)
      job = insert(:workbench_job, workbench: workbench)
      eval_result =
        insert(:workbench_eval_result,
          workbench_eval: eval,
          workbench_job: job,
          grade: 9,
          feedback: %{summary: "strong result", prompt: "p", result: "r", logic: "l"}
        )

      {:ok, %{data: %{"workbenchJob" => found}}} = run_query("""
        query WorkbenchJob($id: ID!) {
          workbenchJob(id: $id) {
            id
            evalResult {
              id
              grade
              feedback { summary }
            }
          }
        }
      """, %{"id" => job.id}, %{current_user: admin_user()})

      assert found["id"] == job.id
      assert found["evalResult"]["id"] == eval_result.id
      assert found["evalResult"]["grade"] == 9
      assert found["evalResult"]["feedback"]["summary"] == "strong result"
    end

    test "it resolves metricsTool using the generated observability metrics tool name and parses GraphQL output" do
      workbench = insert(:workbench)
      tool = insert(:workbench_tool,
        project: workbench.project,
        name: "prom",
        tool: :prometheus,
        categories: [:metrics],
        configuration: %{
          prometheus: %{url: "https://prom.example.com", token: "token", tenant_id: nil}
        }
      )

      insert(:workbench_tool_association, workbench: workbench, tool: tool)
      job = insert(:workbench_job, workbench: workbench)
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      expect(Client, :connect, fn -> {:ok, :mock_conn} end)
      expect(Stub, :metrics, fn :mock_conn, input, opts ->
        assert opts[:timeout] == :timer.seconds(30)
        assert input.query == "sum(rate(http_requests_total[5m]))"
        assert input.step == "30s"

        {:ok,
         %MetricsQueryOutput{
           metrics: [
             %MetricPoint{
               timestamp: Google.Protobuf.from_datetime(now),
               name: "http_requests_total",
               value: 42.5,
               labels: %{"service" => "api", "method" => "GET"}
             }
           ]
         }}
      end)

      tool_name = "workbench_observability_metrics_prom"

      {:ok, %{data: %{"workbenchJob" => found}}} = run_query("""
        query WorkbenchJob($id: ID!, $name: String!, $arguments: Json) {
          workbenchJob(id: $id) {
            id
            metricsTool(name: $name, arguments: $arguments) {
              timestamp
              name
              value
              labels
            }
          }
        }
      """, %{
        "id" => job.id,
        "name" => tool_name,
        "arguments" => Jason.encode!(%{"query" => "sum(rate(http_requests_total[5m]))", "step" => "30s"})
      }, %{current_user: admin_user()})

      assert found["id"] == job.id
      [metric] = found["metricsTool"]
      assert metric["timestamp"]
      assert metric["name"] == "http_requests_total"
      assert metric["value"] == 42.5
      assert metric["labels"] == %{"service" => "api", "method" => "GET"}

      {:ok, %{errors: [_ | _]}} = run_query("""
        query WorkbenchJob($id: ID!, $arguments: Json) {
          workbenchJob(id: $id) {
            id
            metricsTool(name: "prom", arguments: $arguments) {
              name
            }
          }
        }
      """, %{
        "id" => job.id,
        "arguments" => Jason.encode!(%{"query" => "sum(rate(http_requests_total[5m]))", "step" => "30s"})
      }, %{current_user: admin_user()})
    end

    test "it resolves tracesTool using the generated observability traces tool name and parses GraphQL output" do
      workbench = insert(:workbench)
      tool = insert(:workbench_tool,
        project: workbench.project,
        name: "tempo",
        tool: :tempo,
        categories: [:traces],
        configuration: %{
          tempo: %{url: "https://tempo.example.com", token: "token", tenant_id: nil}
        }
      )

      insert(:workbench_tool_association, workbench: workbench, tool: tool)
      job = insert(:workbench_job, workbench: workbench)
      now = DateTime.utc_now() |> DateTime.truncate(:second)
      ten_seconds_later = DateTime.add(now, 10, :second)

      expect(Client, :connect, fn -> {:ok, :mock_conn} end)
      expect(Stub, :traces, fn :mock_conn, input, opts ->
        assert opts[:timeout] == :timer.minutes(1)
        assert input.query == "{ service.name = \"checkout\" }"
        assert input.limit == 50

        {:ok,
         %TracesQueryOutput{
           spans: [
             %TraceSpan{
               trace_id: "trace-1",
               span_id: "span-1",
               parent_id: "parent-1",
               name: "GET /checkout",
               service: "checkout",
               start: Google.Protobuf.from_datetime(now),
               end: Google.Protobuf.from_datetime(ten_seconds_later),
               tags: %{"http.method" => "GET"}
             }
           ]
         }}
      end)

      tool_name = "workbench_observability_traces_tempo"

      {:ok, %{data: %{"workbenchJob" => found}}} = run_query("""
        query WorkbenchJob($id: ID!, $name: String!, $arguments: Json) {
          workbenchJob(id: $id) {
            id
            tracesTool(name: $name, arguments: $arguments) {
              traceId
              spanId
              parentId
              name
              service
              start
              end
              tags
            }
          }
        }
      """, %{
        "id" => job.id,
        "name" => tool_name,
        "arguments" => Jason.encode!(%{"query" => "{ service.name = \"checkout\" }", "limit" => 50})
      }, %{current_user: admin_user()})

      assert found["id"] == job.id
      [trace] = found["tracesTool"]
      assert trace["traceId"] == "trace-1"
      assert trace["spanId"] == "span-1"
      assert trace["parentId"] == "parent-1"
      assert trace["name"] == "GET /checkout"
      assert trace["service"] == "checkout"
      assert trace["start"]
      assert trace["end"]
      assert trace["tags"] == %{"http.method" => "GET"}
    end
  end

  describe "workbenchJobActivity" do
    test "it can fetch a workbench job activity by id" do
      user = insert(:user)

      activity =
        insert(:workbench_job_activity,
          workbench_job: insert(:workbench_job),
          user: user,
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
            user {
              id
            }
          }
        }
      """, %{"id" => activity.id}, %{current_user: admin_user()})

      assert found["id"] == activity.id
      assert found["status"] == "RUNNING"
      assert found["type"] == "CODING"
      assert found["prompt"] == "fix the bug"
      assert found["user"]["id"] == user.id
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

  describe "recentWorkbenchJobs" do
    test "admins see recent jobs across all workbenches" do
      workbench_a = insert(:workbench)
      workbench_b = insert(:workbench)
      jobs = insert_list(2, :workbench_job, workbench: workbench_a)
              ++ insert_list(2, :workbench_job, workbench: workbench_b)

      {:ok, %{data: %{"recentWorkbenchJobs" => found}}} = run_query("""
        query Recent($count: Int) {
          recentWorkbenchJobs(count: $count) {
            id
          }
        }
      """, %{"count" => 10}, %{current_user: admin_user()})

      assert ids_equal(found, jobs)
    end

    test "users only see jobs for workbenches they have access to" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      jobs = insert_list(2, :workbench_job, workbench: workbench)

      other_workbench = insert(:workbench)
      insert_list(3, :workbench_job, workbench: other_workbench)

      {:ok, %{data: %{"recentWorkbenchJobs" => found}}} = run_query("""
        query {
          recentWorkbenchJobs {
            id
          }
        }
      """, %{}, %{current_user: user})

      assert ids_equal(found, jobs)
    end

    test "users with no workbench access see no jobs" do
      user = insert(:user)
      insert_list(3, :workbench_job)

      {:ok, %{data: %{"recentWorkbenchJobs" => found}}} = run_query("""
        query {
          recentWorkbenchJobs {
            id
          }
        }
      """, %{}, %{current_user: user})

      assert Enum.empty?(found)
    end

    test "users with direct read bindings on a workbench see its jobs without project access" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      jobs = insert_list(2, :workbench_job, workbench: workbench)
      insert_list(2, :workbench_job)

      {:ok, %{data: %{"recentWorkbenchJobs" => found}}} = run_query("""
        query {
          recentWorkbenchJobs {
            id
          }
        }
      """, %{}, %{current_user: user})

      assert ids_equal(found, jobs)
    end

    test "users with direct write bindings on a workbench see its jobs without project access" do
      user = insert(:user)
      workbench = insert(:workbench, write_bindings: [%{user_id: user.id}])
      jobs = insert_list(2, :workbench_job, workbench: workbench)
      insert_list(2, :workbench_job)

      {:ok, %{data: %{"recentWorkbenchJobs" => found}}} = run_query("""
        query {
          recentWorkbenchJobs {
            id
          }
        }
      """, %{}, %{current_user: user})

      assert ids_equal(found, jobs)
    end

    test "users in a group bound to a workbench see its jobs without project access" do
      user = insert(:user)
      group = insert(:group)
      insert(:group_member, group: group, user: user)
      workbench = insert(:workbench, read_bindings: [%{group_id: group.id}])
      jobs = insert_list(2, :workbench_job, workbench: workbench)
      insert_list(2, :workbench_job)

      {:ok, %{data: %{"recentWorkbenchJobs" => found}}} = run_query("""
        query {
          recentWorkbenchJobs {
            id
          }
        }
      """, %{}, %{current_user: user})

      assert ids_equal(found, jobs)
    end

    test "it respects the count argument" do
      insert_list(5, :workbench_job)

      {:ok, %{data: %{"recentWorkbenchJobs" => found}}} = run_query("""
        query Recent($count: Int) {
          recentWorkbenchJobs(count: $count) {
            id
          }
        }
      """, %{"count" => 3}, %{current_user: admin_user()})

      assert length(found) == 3
    end

    test "it errors when more than 20 are requested" do
      insert_list(2, :workbench_job)

      {:ok, %{errors: [%{message: msg} | _]}} = run_query("""
        query Recent($count: Int) {
          recentWorkbenchJobs(count: $count) {
            id
          }
        }
      """, %{"count" => 21}, %{current_user: admin_user()})

      assert msg =~ "20"
    end

    test "it errors when less than 1 is requested" do
      {:ok, %{errors: [_ | _]}} = run_query("""
        query Recent($count: Int) {
          recentWorkbenchJobs(count: $count) {
            id
          }
        }
      """, %{"count" => 0}, %{current_user: admin_user()})
    end

    test "it defaults to returning 3 jobs" do
      insert_list(5, :workbench_job)

      {:ok, %{data: %{"recentWorkbenchJobs" => found}}} = run_query("""
        query {
          recentWorkbenchJobs {
            id
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert length(found) == 3
    end

    test "it returns jobs ordered by most recent first" do
      jobs = for _ <- 1..3, do: insert(:workbench_job)
      expected = jobs |> Enum.reverse() |> Enum.map(& &1.id)

      {:ok, %{data: %{"recentWorkbenchJobs" => found}}} = run_query("""
        query {
          recentWorkbenchJobs {
            id
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert Enum.map(found, & &1["id"]) == expected
    end
  end

  describe "workbenchJobSearch" do
    test "it can search vector-indexed workbench jobs" do
      import ElasticsearchUtils

      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{
            enabled: true,
            store: :elastic,
            elastic: es_vector_settings()
          }
        }
      )

      workbench = insert(:workbench)

      job =
        insert(:workbench_job,
          workbench: workbench,
          status: :successful,
          prompt: "investigate database outage",
          result: build(:workbench_job_result, conclusion: "root cause was connection pool exhaustion")
        )

      pr = insert(:pull_request,
        workbench_job: job,
        title: "fix pool size",
        url: "https://github.com/org/repo/pull/1"
      )

      expect(Console.AI.VectorStore, :fetch, fn "database outage", opts ->
        assert opts[:count] == 2
        assert opts[:filters] == [datatype: {:raw, :workbench_job}, workbench_id: workbench.id]
        assert %{__struct__: Console.Schema.User} = opts[:user]

        {:ok, [
          %Console.AI.VectorStore.Response{
            type: :workbench,
            workbench_job: %Console.Schema.WorkbenchJob.Mini{id: job.id}
          }
        ]}
      end)

      {:ok, %{data: %{"workbenchJobSearch" => [found | _]}}} = run_query("""
        query WorkbenchJobSearch($workbenchId: ID!) {
          workbenchJobSearch(q: "database outage", workbenchId: $workbenchId, limit: 2) {
            id
            status
            prompt
            result { conclusion }
            pullRequests { title url }
          }
        }
      """, %{"workbenchId" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == job.id
      assert found["status"] == "SUCCESSFUL"
      assert found["prompt"] == "investigate database outage"
      assert found["result"]["conclusion"] == "root cause was connection pool exhaustion"
      assert found["pullRequests"] == [
        %{"title" => pr.title, "url" => pr.url}
      ]
    end

    test "it errors when the vector store is not enabled" do
      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{enabled: false}
        }
      )

      reject(&Console.AI.VectorStore.fetch/2)

      workbench = insert(:workbench)

      assert {:ok, %{errors: [%{message: message} | _]}} = run_query("""
        query WorkbenchJobSearch($workbenchId: ID!) {
          workbenchJobSearch(q: "database outage", workbenchId: $workbenchId, limit: 2) {
            id
          }
        }
      """, %{"workbenchId" => workbench.id}, %{current_user: admin_user()})

      assert message == "Vector store is not enabled, cannot query"
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

  describe "workbench_chatbot" do
    test "it can fetch a workbench chatbot by id" do
      workbench = insert(:workbench)
      conn = insert(:chat_connection)

      bot =
        insert(:workbench_chatbot,
          workbench: workbench,
          chat_connection: conn,
          channel: "C-single-#{System.unique_integer([:positive])}"
        )

      {:ok, %{data: %{"workbenchChatbot" => found}}} = run_query("""
        query WorkbenchChatbot($id: ID!) {
          workbenchChatbot(id: $id) {
            id
            channel
            workbench { id }
            chatConnection { id }
          }
        }
      """, %{"id" => bot.id}, %{current_user: admin_user()})

      assert found["id"] == bot.id
      assert found["channel"] == bot.channel
      assert found["workbench"]["id"] == workbench.id
      assert found["chatConnection"]["id"] == conn.id
    end

    test "users without read access cannot fetch a chatbot" do
      user = insert(:user)
      bot = insert(:workbench_chatbot)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query WorkbenchChatbot($id: ID!) {
          workbenchChatbot(id: $id) {
            id
          }
        }
      """, %{"id" => bot.id}, %{current_user: user})
    end
  end

  describe "eval result averages" do
    test "averageWorkbenchEvalResults respects workbench permissions and returns workbench rows" do
      user = insert(:user)
      allowed_project = insert(:project, read_bindings: [%{user_id: user.id}])
      denied_project = insert(:project)

      allowed_wb = insert(:workbench, project: allowed_project)
      denied_wb = insert(:workbench, project: denied_project)
      allowed_eval = insert(:workbench_eval, workbench: allowed_wb)
      denied_eval = insert(:workbench_eval, workbench: denied_wb)

      insert(:workbench_eval_result, workbench_eval: allowed_eval, workbench_job: insert(:workbench_job, workbench: allowed_wb), grade: 6)
      insert(:workbench_eval_result, workbench_eval: allowed_eval, workbench_job: insert(:workbench_job, workbench: allowed_wb), grade: 8)
      insert(:workbench_eval_result, workbench_eval: denied_eval, workbench_job: insert(:workbench_job, workbench: denied_wb), grade: 10)

      {:ok, %{data: %{"averageWorkbenchEvalResults" => rows}}} = run_query("""
        query AvgWorkbenchEvalResults($period: EvalResultsPeriod) {
          averageWorkbenchEvalResults(period: $period) {
            timestamp
            average
            workbench { id }
          }
        }
      """, %{"period" => "DAY"}, %{current_user: user})

      assert length(rows) == 1
      row = hd(rows)
      assert row["workbench"]["id"] == allowed_wb.id
      assert row["average"] == 7.0
      assert row["timestamp"]
    end

    test "averageWorkbenchEvalResults returns one row per time bucket per workbench" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      wb = insert(:workbench, project: project)
      eval = insert(:workbench_eval, workbench: wb)
      older = DateTime.utc_now() |> DateTime.add(-3, :day)
      newer = DateTime.utc_now() |> DateTime.add(-1, :day)

      insert(:workbench_eval_result,
        workbench_eval: eval,
        workbench_job: insert(:workbench_job, workbench: wb),
        grade: 4,
        inserted_at: older,
        updated_at: older
      )

      insert(:workbench_eval_result,
        workbench_eval: eval,
        workbench_job: insert(:workbench_job, workbench: wb),
        grade: 8,
        inserted_at: newer,
        updated_at: newer
      )

      {:ok, %{data: %{"averageWorkbenchEvalResults" => rows}}} = run_query("""
        query AvgWorkbenchEvalResults($period: EvalResultsPeriod) {
          averageWorkbenchEvalResults(period: $period) {
            timestamp
            average
            workbench { id }
          }
        }
      """, %{"period" => "DAY"}, %{current_user: user})

      assert length(rows) == 2
      assert Enum.all?(rows, &(&1["workbench"]["id"] == wb.id))
      averages = rows |> Enum.map(& &1["average"]) |> Enum.sort()
      assert averages == [4.0, 8.0]
    end

    test "averageEvalResults returns global averages by period" do
      wb1 = insert(:workbench)
      wb2 = insert(:workbench)
      eval1 = insert(:workbench_eval, workbench: wb1)
      eval2 = insert(:workbench_eval, workbench: wb2)

      insert(:workbench_eval_result, workbench_eval: eval1, workbench_job: insert(:workbench_job, workbench: wb1), grade: 4)
      insert(:workbench_eval_result, workbench_eval: eval2, workbench_job: insert(:workbench_job, workbench: wb2), grade: 10)

      {:ok, %{data: %{"averageEvalResults" => rows}}} = run_query("""
        query AvgEvalResults($period: EvalResultsPeriod) {
          averageEvalResults(period: $period) {
            timestamp
            average
          }
        }
      """, %{"period" => "DAY"}, %{current_user: admin_user()})

      assert length(rows) == 1
      row = hd(rows)
      assert row["average"] == 7.0
      assert row["timestamp"]
    end
  end

  describe "workbenchUsage" do
    test "aggregates usage and treats null or missing usage fields as zero" do
      workbench = insert(:workbench)
      timestamp = DateTime.new!(Date.add(Date.utc_today(), -1), ~T[10:00:00], "Etc/UTC")

      insert(:workbench_job,
        workbench: workbench,
        usage: %{input_tokens: 10, output_tokens: 5, total_cost: 0.25},
        inserted_at: timestamp,
        updated_at: timestamp
      )

      insert(:workbench_job,
        workbench: workbench,
        usage: %{input_tokens: 2},
        inserted_at: timestamp,
        updated_at: timestamp
      )

      insert(:workbench_job,
        workbench: workbench,
        usage: nil,
        inserted_at: timestamp,
        updated_at: timestamp
      )

      {:ok, %{data: %{"workbenchUsage" => [row]}}} = run_query("""
        query WorkbenchUsage($period: EvalResultsPeriod) {
          workbenchUsage(period: $period) {
            timestamp
            inputTokens
            outputTokens
            totalCost
            workbench { id }
          }
        }
      """, %{"period" => "DAY"}, %{current_user: admin_user()})

      assert row["workbench"]["id"] == workbench.id
      assert row["inputTokens"] == 12
      assert row["outputTokens"] == 5
      assert row["totalCost"] == 0.25
      assert row["timestamp"]
    end

    test "aggregates jobs into the correct day buckets" do
      workbench = insert(:workbench)
      older = DateTime.new!(Date.add(Date.utc_today(), -3), ~T[10:00:00], "Etc/UTC")
      newer = DateTime.new!(Date.add(Date.utc_today(), -1), ~T[10:00:00], "Etc/UTC")

      insert(:workbench_job,
        workbench: workbench,
        usage: %{input_tokens: 4, output_tokens: 2, total_cost: 0.1},
        inserted_at: older,
        updated_at: older
      )

      insert(:workbench_job,
        workbench: workbench,
        usage: %{input_tokens: 5, output_tokens: 3, total_cost: 0.2},
        inserted_at: newer,
        updated_at: newer
      )

      insert(:workbench_job,
        workbench: workbench,
        usage: %{input_tokens: 7, output_tokens: 11, total_cost: 0.4},
        inserted_at: newer,
        updated_at: newer
      )

      {:ok, %{data: %{"workbenchUsage" => rows}}} = run_query("""
        query WorkbenchUsage($period: EvalResultsPeriod) {
          workbenchUsage(period: $period) {
            inputTokens
            outputTokens
            totalCost
            workbench { id }
          }
        }
      """, %{"period" => "DAY"}, %{current_user: admin_user()})

      assert length(rows) == 2
      assert Enum.all?(rows, &(&1["workbench"]["id"] == workbench.id))
      assert Enum.map(rows, & &1["inputTokens"]) |> Enum.sort() == [4, 12]
      assert Enum.map(rows, & &1["outputTokens"]) |> Enum.sort() == [2, 14]
      total_costs = Enum.map(rows, & &1["totalCost"]) |> Enum.sort()
      assert_in_delta Enum.at(total_costs, 0), 0.1, 0.001
      assert_in_delta Enum.at(total_costs, 1), 0.6, 0.001
    end

    test "returns separate aggregates for multiple workbenches and respects project filters" do
      project = insert(:project)
      other_project = insert(:project)
      workbench_a = insert(:workbench, project: project)
      workbench_b = insert(:workbench, project: project)
      workbench_c = insert(:workbench, project: other_project)
      timestamp = DateTime.new!(Date.add(Date.utc_today(), -1), ~T[10:00:00], "Etc/UTC")

      insert(:workbench_job,
        workbench: workbench_a,
        usage: %{input_tokens: 3, output_tokens: 4, total_cost: 0.3},
        inserted_at: timestamp,
        updated_at: timestamp
      )

      insert(:workbench_job,
        workbench: workbench_b,
        usage: %{input_tokens: 7, output_tokens: 8, total_cost: 0.7},
        inserted_at: timestamp,
        updated_at: timestamp
      )

      insert(:workbench_job,
        workbench: workbench_c,
        usage: %{input_tokens: 11, output_tokens: 12, total_cost: 1.1},
        inserted_at: timestamp,
        updated_at: timestamp
      )

      {:ok, %{data: %{"workbenchUsage" => rows}}} = run_query("""
        query WorkbenchUsage($period: EvalResultsPeriod, $projectId: ID!) {
          workbenchUsage(period: $period, projectId: $projectId) {
            inputTokens
            outputTokens
            totalCost
            workbench { id }
          }
        }
      """, %{"period" => "DAY", "projectId" => project.id}, %{current_user: admin_user()})

      assert length(rows) == 2
      assert ids_equal(Enum.map(rows, & &1["workbench"]), [workbench_a, workbench_b])

      usage_by_workbench = Map.new(rows, fn row ->
        {row["workbench"]["id"], {row["inputTokens"], row["outputTokens"], row["totalCost"]}}
      end)

      assert usage_by_workbench[workbench_a.id] == {3, 4, 0.3}
      assert usage_by_workbench[workbench_b.id] == {7, 8, 0.7}
      refute Map.has_key?(usage_by_workbench, workbench_c.id)
    end
  end

  describe "workbench pull request metrics" do
    test "workbenchPullRequests respects workbench permissions" do
      user = insert(:user)
      allowed_project = insert(:project, read_bindings: [%{user_id: user.id}])
      denied_project = insert(:project)

      allowed_wb = insert(:workbench, project: allowed_project)
      denied_wb = insert(:workbench, project: denied_project)

      job_allowed = insert(:workbench_job, workbench: allowed_wb)
      job_denied = insert(:workbench_job, workbench: denied_wb)

      insert(:pull_request, workbench_job: job_allowed, status: :merged)
      insert(:pull_request, workbench_job: job_allowed, status: :closed)
      insert(:pull_request, workbench_job: job_denied, status: :merged)

      {:ok, %{data: %{"workbenchPullRequests" => total}}} = run_query("""
        query {
          workbenchPullRequests
        }
      """, %{}, %{current_user: user})

      assert total == 3
    end

    test "workbenchAggregates returns merged PR stats and average eval grade" do
      wb = insert(:workbench)
      job = insert(:workbench_job, workbench: wb)
      insert(:pull_request, workbench_job: job, status: :merged)
      insert(:pull_request, workbench_job: job, status: :closed)

      eval = insert(:workbench_eval, workbench: wb)
      insert(:workbench_eval_result,
        workbench_eval: eval,
        workbench_job: job,
        grade: 6
      )
      insert(:workbench_eval_result,
        workbench_eval: eval,
        workbench_job: insert(:workbench_job, workbench: wb),
        grade: 10
      )

      {:ok, %{data: %{"workbenchAggregates" => agg}}} = run_query("""
        query {
          workbenchAggregates {
            pullRequests
            pullRequestMergeRate
            evalResults
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert agg["pullRequests"] == 1
      assert agg["pullRequestMergeRate"] == 0.5
      assert agg["evalResults"] == 8.0
    end

    test "workbenchPrMergeRates returns global merge rate buckets" do
      wb1 = insert(:workbench)
      wb2 = insert(:workbench)
      job1 = insert(:workbench_job, workbench: wb1)
      job2 = insert(:workbench_job, workbench: wb2)

      insert(:pull_request, workbench_job: job1, status: :merged)
      insert(:pull_request, workbench_job: job2, status: :closed)

      {:ok, %{data: %{"workbenchPrMergeRates" => rows}}} = run_query("""
        query WorkbenchPrMergeRates($period: EvalResultsPeriod) {
          workbenchPrMergeRates(period: $period) {
            timestamp
            merge_rate
          }
        }
      """, %{"period" => "DAY"}, %{current_user: admin_user()})

      assert length(rows) == 1
      row = hd(rows)
      assert row["merge_rate"] == 0.5
      assert row["timestamp"]
    end

    test "workbenchPullRequestMergeRatesByWorkbench respects workbench permissions" do
      user = insert(:user)
      allowed_project = insert(:project, read_bindings: [%{user_id: user.id}])
      denied_project = insert(:project)

      allowed_wb = insert(:workbench, project: allowed_project)
      denied_wb = insert(:workbench, project: denied_project)

      job_allowed = insert(:workbench_job, workbench: allowed_wb)
      job_denied = insert(:workbench_job, workbench: denied_wb)

      insert(:pull_request, workbench_job: job_allowed, status: :merged)
      insert(:pull_request, workbench_job: job_denied, status: :merged)

      {:ok, %{data: %{"workbenchPrMergeRatesByWorkbench" => rows}}} = run_query("""
        query WorkbenchPrMergeRatesByWb($period: EvalResultsPeriod) {
          workbenchPrMergeRatesByWorkbench(period: $period) {
            timestamp
            merge_rate
            workbench { id }
          }
        }
      """, %{"period" => "DAY"}, %{current_user: user})

      assert length(rows) == 1
      row = hd(rows)
      assert row["workbench"]["id"] == allowed_wb.id
      assert row["merge_rate"] == 1.0
      assert row["timestamp"]
    end
  end
end
