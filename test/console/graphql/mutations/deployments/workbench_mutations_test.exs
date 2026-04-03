defmodule Console.GraphQl.Deployments.WorkbenchMutationsTest do
  use Console.DataCase, async: true

  @http_tool_attrs %{
    "name" => "my_http_tool",
    "tool" => "HTTP",
    "projectId" => nil,
    "configuration" => %{
      "http" => %{
        "url" => "https://example.com",
        "method" => "POST",
        "headers" => [],
        "body" => "{}",
        "input_schema" => JSON.encode!(%{"type" => "object", "properties" => %{}, "required" => []})
      }
    }
  }

  describe "createWorkbench" do
    test "it can create a workbench" do
      project = insert(:project)

      {:ok, %{data: %{"createWorkbench" => workbench}}} = run_query("""
        mutation WorkbenchCreate($attributes: WorkbenchAttributes!) {
          createWorkbench(attributes: $attributes) {
            id
            name
            description
          }
        }
      """, %{"attributes" => %{"name" => "test-workbench", "description" => "A test", "projectId" => project.id}}, %{current_user: admin_user()})

      assert workbench["name"] == "test-workbench"
      assert workbench["description"] == "A test"
    end

    test "it can create a workbench with configuration" do
      project = insert(:project)
      attrs = %{
        "name" => "configured-workbench",
        "projectId" => project.id,
        "configuration" => %{
          "infrastructure" => %{"services" => true, "stacks" => true, "kubernetes" => false},
          "coding" => %{"mode" => "ANALYZE", "repositories" => ["repo1", "repo2"]}
        }
      }

      {:ok, %{data: %{"createWorkbench" => workbench}}} = run_query("""
        mutation WorkbenchCreate($attributes: WorkbenchAttributes!) {
          createWorkbench(attributes: $attributes) {
            id
            name
            configuration {
              infrastructure { services stacks kubernetes }
              coding { mode repositories }
            }
          }
        }
      """, %{"attributes" => attrs}, %{current_user: admin_user()})

      assert workbench["name"] == "configured-workbench"
      assert workbench["configuration"]["infrastructure"]["services"] == true
      assert workbench["configuration"]["infrastructure"]["stacks"] == true
      assert workbench["configuration"]["infrastructure"]["kubernetes"] == false
      assert workbench["configuration"]["coding"]["mode"] == "ANALYZE"
      assert workbench["configuration"]["coding"]["repositories"] == ["repo1", "repo2"]
    end

    test "it can create a workbench with tool associations (tools are set on workbench, not on tool)" do
      project = insert(:project)
      tool1 = insert(:workbench_tool, project: project, name: "gql_tool_a")
      tool2 = insert(:workbench_tool, project: project, name: "gql_tool_b")
      attrs = %{
        "name" => "workbench-with-tools",
        "projectId" => project.id,
        "toolAssociations" => [%{"toolId" => tool1.id}, %{"toolId" => tool2.id}]
      }

      {:ok, %{data: %{"createWorkbench" => workbench}}} = run_query("""
        mutation WorkbenchCreate($attributes: WorkbenchAttributes!) {
          createWorkbench(attributes: $attributes) {
            id
            name
            tools { id name }
          }
        }
      """, %{"attributes" => attrs}, %{current_user: admin_user()})

      assert workbench["name"] == "workbench-with-tools"
      assert length(workbench["tools"]) == 2
      assert ids_equal(workbench["tools"], [tool1, tool2])
    end

    test "project writers can create a workbench" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"createWorkbench" => workbench}}} = run_query("""
        mutation WorkbenchCreate($attributes: WorkbenchAttributes!) {
          createWorkbench(attributes: $attributes) {
            id
            name
            project { id }
          }
        }
      """, %{"attributes" => %{"name" => "writer-workbench", "projectId" => project.id}}, %{current_user: user})

      assert workbench["name"] == "writer-workbench"
      assert workbench["project"]["id"] == project.id
    end

    test "project readers cannot create a workbench" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation WorkbenchCreate($attributes: WorkbenchAttributes!) {
          createWorkbench(attributes: $attributes) {
            id
            name
          }
        }
      """, %{"attributes" => %{"name" => "reader-workbench", "projectId" => project.id}}, %{current_user: user})
    end

    test "fails when name is missing (required)" do
      project = insert(:project)

      {:ok, %{errors: [error | _]}} = run_query("""
        mutation WorkbenchCreate($attributes: WorkbenchAttributes!) {
          createWorkbench(attributes: $attributes) {
            id
            name
          }
        }
      """, %{"attributes" => %{"description" => "No name", "projectId" => project.id}}, %{current_user: admin_user()})

      assert error.message =~ "name"
    end

    test "fails when name is duplicate (unique)" do
      project = insert(:project)
      insert(:workbench, project: project, name: "taken-name")

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation WorkbenchCreate($attributes: WorkbenchAttributes!) {
          createWorkbench(attributes: $attributes) {
            id
            name
          }
        }
      """, %{"attributes" => %{"name" => "taken-name", "projectId" => project.id}}, %{current_user: admin_user()})
    end
  end

  describe "updateWorkbench" do
    test "it can update a workbench" do
      workbench = insert(:workbench)

      {:ok, %{data: %{"updateWorkbench" => updated}}} = run_query("""
        mutation WorkbenchUpdate($id: ID!, $attributes: WorkbenchAttributes!) {
          updateWorkbench(id: $id, attributes: $attributes) {
            id
            name
            description
          }
        }
      """, %{
        "id" => workbench.id,
        "attributes" => %{"name" => workbench.name, "description" => "Updated description"}
      }, %{current_user: admin_user()})

      assert updated["id"] == workbench.id
      assert updated["description"] == "Updated description"
    end

    test "it can update a workbench with configuration" do
      workbench = insert(:workbench)
      attrs = %{
        "name" => workbench.name,
        "configuration" => %{
          "infrastructure" => %{"services" => false, "stacks" => true, "kubernetes" => true},
          "coding" => %{"mode" => "WRITE", "repositories" => ["single-repo"]}
        }
      }

      {:ok, %{data: %{"updateWorkbench" => updated}}} = run_query("""
        mutation WorkbenchUpdate($id: ID!, $attributes: WorkbenchAttributes!) {
          updateWorkbench(id: $id, attributes: $attributes) {
            id
            configuration {
              infrastructure { services stacks kubernetes }
              coding { mode repositories }
            }
          }
        }
      """, %{"id" => workbench.id, "attributes" => attrs}, %{current_user: admin_user()})

      assert updated["id"] == workbench.id
      assert updated["configuration"]["infrastructure"]["services"] == false
      assert updated["configuration"]["infrastructure"]["stacks"] == true
      assert updated["configuration"]["infrastructure"]["kubernetes"] == true
      assert updated["configuration"]["coding"]["mode"] == "WRITE"
      assert updated["configuration"]["coding"]["repositories"] == ["single-repo"]
    end

    test "it can update a workbench with tool associations (tools are set on workbench, not on tool)" do
      workbench = insert(:workbench)
      tool1 = insert(:workbench_tool, project: workbench.project, name: "update_tool_a")
      tool2 = insert(:workbench_tool, project: workbench.project, name: "update_tool_b")
      attrs = %{
        "name" => workbench.name,
        "toolAssociations" => [%{"toolId" => tool1.id}, %{"toolId" => tool2.id}]
      }

      {:ok, %{data: %{"updateWorkbench" => updated}}} = run_query("""
        mutation WorkbenchUpdate($id: ID!, $attributes: WorkbenchAttributes!) {
          updateWorkbench(id: $id, attributes: $attributes) {
            id
            tools { id name }
          }
        }
      """, %{"id" => workbench.id, "attributes" => attrs}, %{current_user: admin_user()})

      assert updated["id"] == workbench.id
      assert length(updated["tools"]) == 2
      assert ids_equal(updated["tools"], [tool1, tool2])
    end
  end

  describe "deleteWorkbench" do
    test "it can delete a workbench" do
      workbench = insert(:workbench)

      {:ok, %{data: %{"deleteWorkbench" => found}}} = run_query("""
        mutation WorkbenchDelete($id: ID!) {
          deleteWorkbench(id: $id) {
            id
          }
        }
      """, %{"id" => workbench.id}, %{current_user: admin_user()})

      assert found["id"] == workbench.id
      refute refetch(workbench)
    end
  end

  describe "createWorkbenchTool" do
    test "it can create a workbench tool" do
      project = insert(:project)
      attrs = Map.put(@http_tool_attrs, "projectId", project.id)

      {:ok, %{data: %{"createWorkbenchTool" => tool}}} = run_query("""
        mutation WorkbenchToolCreate($attributes: WorkbenchToolAttributes!) {
          createWorkbenchTool(attributes: $attributes) {
            id
            name
            tool
          }
        }
      """, %{"attributes" => attrs}, %{current_user: admin_user()})

      assert tool["name"] == "my_http_tool"
      assert tool["tool"] == "HTTP"
    end

    test "project writers can create a tool" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      attrs = Map.put(@http_tool_attrs, "projectId", project.id)

      {:ok, %{data: %{"createWorkbenchTool" => tool}}} = run_query("""
        mutation WorkbenchToolCreate($attributes: WorkbenchToolAttributes!) {
          createWorkbenchTool(attributes: $attributes) {
            id
            name
            project { id }
          }
        }
      """, %{"attributes" => attrs}, %{current_user: user})

      assert tool["name"] == "my_http_tool"
      assert tool["project"]["id"] == project.id
    end

    test "project readers cannot create a tool" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      attrs = Map.put(@http_tool_attrs, "projectId", project.id)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation WorkbenchToolCreate($attributes: WorkbenchToolAttributes!) {
          createWorkbenchTool(attributes: $attributes) {
            id
            name
          }
        }
      """, %{"attributes" => attrs}, %{current_user: user})
    end
  end

  describe "updateWorkbenchTool" do
    test "it can update a workbench tool" do
      tool = insert(:workbench_tool)
      attrs = %{
        "name" => tool.name,
        "tool" => "HTTP",
        "projectId" => tool.project_id,
        "configuration" => %{
          "http" => %{
            "url" => "https://updated.com",
            "method" => "GET",
            "headers" => [],
            "body" => "",
            "input_schema" => JSON.encode!(%{"type" => "object", "properties" => %{}, "required" => []})
          }
        }
      }

      {:ok, %{data: %{"updateWorkbenchTool" => updated}}} = run_query("""
        mutation WorkbenchToolUpdate($id: ID!, $attributes: WorkbenchToolAttributes!) {
          updateWorkbenchTool(id: $id, attributes: $attributes) {
            id
            name
          }
        }
      """, %{"id" => tool.id, "attributes" => attrs}, %{current_user: admin_user()})

      assert updated["id"] == tool.id
      assert updated["name"] == tool.name
    end
  end

  describe "deleteWorkbenchTool" do
    test "it can delete a workbench tool" do
      tool = insert(:workbench_tool)

      {:ok, %{data: %{"deleteWorkbenchTool" => found}}} = run_query("""
        mutation WorkbenchToolDelete($id: ID!) {
          deleteWorkbenchTool(id: $id) {
            id
          }
        }
      """, %{"id" => tool.id}, %{current_user: admin_user()})

      assert found["id"] == tool.id
      refute refetch(tool)
    end
  end

  describe "createWorkbenchJob" do
    test "it can create a job with read access" do
      workbench = insert(:workbench)

      {:ok, %{data: %{"createWorkbenchJob" => job}}} = run_query("""
        mutation CreateWorkbenchJob($workbenchId: ID!, $attributes: WorkbenchJobAttributes!) {
          createWorkbenchJob(workbenchId: $workbenchId, attributes: $attributes) {
            id
            status
            prompt
            workbench { id }
          }
        }
      """, %{"workbenchId" => workbench.id, "attributes" => %{"prompt" => "hello world"}}, %{current_user: admin_user()})

      assert job["workbench"]["id"] == workbench.id
      assert job["status"] == "PENDING"
      assert job["prompt"] == "hello world"
    end

    test "users without read access cannot create a job" do
      user = insert(:user)
      workbench = insert(:workbench)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation CreateWorkbenchJob($workbenchId: ID!) {
          createWorkbenchJob(workbenchId: $workbenchId, attributes: {prompt: "hello world"}) {
            id
            status
          }
        }
      """, %{"workbenchId" => workbench.id}, %{current_user: user})
    end
  end

  describe "createWorkbenchMessage" do
    test "it can create a user message on an idle job owned by the current user" do
      user = admin_user()
      workbench = insert(:workbench)
      job = insert(:workbench_job, user: user, workbench: workbench, status: :successful)

      {:ok, %{data: %{"createWorkbenchMessage" => activity}}} = run_query("""
        mutation CreateWorkbenchMessage($jobId: ID!, $attributes: WorkbenchMessageAttributes!) {
          createWorkbenchMessage(jobId: $jobId, attributes: $attributes) {
            id
            prompt
            type
            status
          }
        }
      """, %{"jobId" => job.id, "attributes" => %{"prompt" => "from graphql"}}, %{current_user: user})

      assert activity["prompt"] == "from graphql"
      assert activity["type"] == "USER"
      assert activity["status"] == "SUCCESSFUL"
    end
  end

  describe "createWorkbenchCron" do
    test "it can create a workbench cron" do
      workbench = insert(:workbench)

      {:ok, %{data: %{"createWorkbenchCron" => cron}}} = run_query("""
        mutation CreateWorkbenchCron($workbenchId: ID!, $attributes: WorkbenchCronAttributes!) {
          createWorkbenchCron(workbenchId: $workbenchId, attributes: $attributes) {
            id
            crontab
            prompt
            workbench { id }
          }
        }
      """, %{"workbenchId" => workbench.id, "attributes" => %{"crontab" => "*/5 * * * *", "prompt" => "run analysis"}}, %{current_user: admin_user()})

      assert cron["workbench"]["id"] == workbench.id
      assert cron["crontab"] == "*/5 * * * *"
      assert cron["prompt"] == "run analysis"
    end

    test "project writers can create a cron" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:ok, %{data: %{"createWorkbenchCron" => cron}}} = run_query("""
        mutation CreateWorkbenchCron($workbenchId: ID!, $attributes: WorkbenchCronAttributes!) {
          createWorkbenchCron(workbenchId: $workbenchId, attributes: $attributes) {
            id
            crontab
            workbench { id }
          }
        }
      """, %{"workbenchId" => workbench.id, "attributes" => %{"crontab" => "0 * * * *", "prompt" => "daily"}}, %{current_user: user})

      assert cron["workbench"]["id"] == workbench.id
      assert cron["crontab"] == "0 * * * *"
    end

    test "project readers cannot create a cron" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation CreateWorkbenchCron($workbenchId: ID!, $attributes: WorkbenchCronAttributes!) {
          createWorkbenchCron(workbenchId: $workbenchId, attributes: $attributes) {
            id
            crontab
          }
        }
      """, %{"workbenchId" => workbench.id, "attributes" => %{"crontab" => "*/5 * * * *", "prompt" => "run"}}, %{current_user: user})
    end
  end

  describe "updateWorkbenchCron" do
    test "it can update a workbench cron" do
      workbench = insert(:workbench)
      cron = insert(:workbench_cron, workbench: workbench, crontab: "0 * * * *", prompt: "old")

      {:ok, %{data: %{"updateWorkbenchCron" => updated}}} = run_query("""
        mutation UpdateWorkbenchCron($id: ID!, $attributes: WorkbenchCronAttributes!) {
          updateWorkbenchCron(id: $id, attributes: $attributes) {
            id
            crontab
            prompt
          }
        }
      """, %{"id" => cron.id, "attributes" => %{"crontab" => "*/10 * * * *", "prompt" => "updated prompt"}}, %{current_user: admin_user()})

      assert updated["id"] == cron.id
      assert updated["crontab"] == "*/10 * * * *"
      assert updated["prompt"] == "updated prompt"
    end

    test "project readers cannot update a cron" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      cron = insert(:workbench_cron, workbench: workbench)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation UpdateWorkbenchCron($id: ID!, $attributes: WorkbenchCronAttributes!) {
          updateWorkbenchCron(id: $id, attributes: $attributes) {
            id
            crontab
          }
        }
      """, %{"id" => cron.id, "attributes" => %{"crontab" => "*/10 * * * *"}}, %{current_user: user})

      assert refetch(cron).crontab != "*/10 * * * *"
    end
  end

  describe "deleteWorkbenchCron" do
    test "it can delete a workbench cron" do
      workbench = insert(:workbench)
      cron = insert(:workbench_cron, workbench: workbench)

      {:ok, %{data: %{"deleteWorkbenchCron" => deleted}}} = run_query("""
        mutation DeleteWorkbenchCron($id: ID!) {
          deleteWorkbenchCron(id: $id) {
            id
          }
        }
      """, %{"id" => cron.id}, %{current_user: admin_user()})

      assert deleted["id"] == cron.id
      refute refetch(cron)
    end

    test "project readers cannot delete a cron" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      cron = insert(:workbench_cron, workbench: workbench)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation DeleteWorkbenchCron($id: ID!) {
          deleteWorkbenchCron(id: $id) {
            id
          }
        }
      """, %{"id" => cron.id}, %{current_user: user})

      assert refetch(cron)
    end
  end

  describe "createWorkbenchWebhook" do
    test "it can create a workbench webhook with observability webhook" do
      workbench = insert(:workbench)
      obs_webhook = insert(:observability_webhook)

      {:ok, %{data: %{"createWorkbenchWebhook" => webhook}}} = run_query("""
        mutation CreateWorkbenchWebhook($workbenchId: ID!, $attributes: WorkbenchWebhookAttributes!) {
          createWorkbenchWebhook(workbenchId: $workbenchId, attributes: $attributes) {
            id
            name
            workbench { id }
            webhook { id }
          }
        }
      """, %{"workbenchId" => workbench.id, "attributes" => %{"name" => "my-webhook", "webhookId" => obs_webhook.id}}, %{current_user: admin_user()})

      assert webhook["workbench"]["id"] == workbench.id
      assert webhook["name"] == "my-webhook"
      assert webhook["webhook"]["id"] == obs_webhook.id
    end

    test "it can create a workbench webhook with issue webhook and query association" do
      workbench = insert(:workbench)
      issue_wh = insert(:issue_webhook)

      {:ok, %{data: %{"createWorkbenchWebhook" => webhook}}} = run_query("""
        mutation CreateWorkbenchWebhook($workbenchId: ID!, $attributes: WorkbenchWebhookAttributes!) {
          createWorkbenchWebhook(workbenchId: $workbenchId, attributes: $attributes) {
            id
            name
            workbench { id }
            issueWebhook { id name }
          }
        }
      """, %{"workbenchId" => workbench.id, "attributes" => %{"name" => "issue-trigger", "issueWebhookId" => issue_wh.id}}, %{current_user: admin_user()})

      assert webhook["workbench"]["id"] == workbench.id
      assert webhook["name"] == "issue-trigger"
      assert webhook["issueWebhook"]["id"] == issue_wh.id
      assert webhook["issueWebhook"]["name"] == issue_wh.name
    end

    test "project writers can create a webhook" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      obs_webhook = insert(:observability_webhook)

      {:ok, %{data: %{"createWorkbenchWebhook" => webhook}}} = run_query("""
        mutation CreateWorkbenchWebhook($workbenchId: ID!, $attributes: WorkbenchWebhookAttributes!) {
          createWorkbenchWebhook(workbenchId: $workbenchId, attributes: $attributes) {
            id
            name
            workbench { id }
          }
        }
      """, %{"workbenchId" => workbench.id, "attributes" => %{"name" => "writer-webhook", "webhookId" => obs_webhook.id}}, %{current_user: user})

      assert webhook["name"] == "writer-webhook"
      assert webhook["workbench"]["id"] == workbench.id
    end

    test "project readers cannot create a webhook" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      obs_webhook = insert(:observability_webhook)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation CreateWorkbenchWebhook($workbenchId: ID!, $attributes: WorkbenchWebhookAttributes!) {
          createWorkbenchWebhook(workbenchId: $workbenchId, attributes: $attributes) {
            id
            name
          }
        }
      """, %{"workbenchId" => workbench.id, "attributes" => %{"name" => "forbidden", "webhookId" => obs_webhook.id}}, %{current_user: user})
    end
  end

  describe "updateWorkbenchWebhook" do
    test "it can update a workbench webhook" do
      workbench = insert(:workbench)
      webhook = insert(:workbench_webhook, workbench: workbench, name: "original")

      {:ok, %{data: %{"updateWorkbenchWebhook" => updated}}} = run_query("""
        mutation UpdateWorkbenchWebhook($id: ID!, $attributes: WorkbenchWebhookAttributes!) {
          updateWorkbenchWebhook(id: $id, attributes: $attributes) {
            id
            name
            matches { substring caseInsensitive }
          }
        }
      """, %{"id" => webhook.id, "attributes" => %{"name" => "updated-name", "matches" => %{"substring" => "error", "caseInsensitive" => true}}}, %{current_user: admin_user()})

      assert updated["id"] == webhook.id
      assert updated["name"] == "updated-name"
      assert updated["matches"]["substring"] == "error"
      assert updated["matches"]["caseInsensitive"] == true
    end

    test "project readers cannot update a webhook" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      webhook = insert(:workbench_webhook, workbench: workbench, name: "original")

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation UpdateWorkbenchWebhook($id: ID!, $attributes: WorkbenchWebhookAttributes!) {
          updateWorkbenchWebhook(id: $id, attributes: $attributes) {
            id
            name
          }
        }
      """, %{"id" => webhook.id, "attributes" => %{"name" => "updated"}}, %{current_user: user})

      assert refetch(webhook).name == "original"
    end
  end

  describe "deleteWorkbenchWebhook" do
    test "it can delete a workbench webhook" do
      workbench = insert(:workbench)
      webhook = insert(:workbench_webhook, workbench: workbench)

      {:ok, %{data: %{"deleteWorkbenchWebhook" => deleted}}} = run_query("""
        mutation DeleteWorkbenchWebhook($id: ID!) {
          deleteWorkbenchWebhook(id: $id) {
            id
          }
        }
      """, %{"id" => webhook.id}, %{current_user: admin_user()})

      assert deleted["id"] == webhook.id
      refute refetch(webhook)
    end

    test "project readers cannot delete a webhook" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      webhook = insert(:workbench_webhook, workbench: workbench)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation DeleteWorkbenchWebhook($id: ID!) {
          deleteWorkbenchWebhook(id: $id) {
            id
          }
        }
      """, %{"id" => webhook.id}, %{current_user: user})

      assert refetch(webhook)
    end
  end
end
