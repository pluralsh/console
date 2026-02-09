defmodule Console.Deployments.WorkbenchesTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.Deployments.Workbenches

  describe "create_workbench/2" do
    test "project writers can create a workbench" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, workbench} = Workbenches.create_workbench(%{
        name: "test-workbench",
        description: "A test",
        project_id: project.id
      }, user)

      assert workbench.project_id == project.id
      assert workbench.name == "test-workbench"
      assert_receive {:event, %PubSub.WorkbenchCreated{item: ^workbench}}
    end

    test "project readers cannot create a workbench" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])

      {:error, _} = Workbenches.create_workbench(%{
        name: "test-workbench",
        project_id: project.id
      }, user)
    end

    test "project writers can create a workbench with tool associations" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      tool1 = insert(:workbench_tool, project: project, name: "tool_a")
      tool2 = insert(:workbench_tool, project: project, name: "tool_b")

      {:ok, workbench} = Workbenches.create_workbench(%{
        name: "workbench-with-tools",
        project_id: project.id,
        tool_associations: [%{tool_id: tool1.id}, %{tool_id: tool2.id}]
      }, user)

      workbench = Console.Repo.preload(workbench, :tools)
      assert length(workbench.tools) == 2
      assert ids_equal(workbench.tools, [tool1, tool2])
    end
  end

  describe "update_workbench/3" do
    test "project writers can update a workbench" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:ok, updated} = Workbenches.update_workbench(%{
        description: "Updated description",
        project_id: project.id
      }, workbench.id, user)

      assert updated.id == workbench.id
      assert updated.description == "Updated description"
      assert_receive {:event, %PubSub.WorkbenchUpdated{item: ^updated}}
    end

    test "project readers cannot update a workbench" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:error, _} = Workbenches.update_workbench(%{
        description: "Updated description",
        project_id: project.id
      }, workbench.id, user)

      assert refetch(workbench).description != "Updated description"
    end

    test "project writers can update a workbench with tool associations" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      tool1 = insert(:workbench_tool, project: project, name: "tool_one")
      tool2 = insert(:workbench_tool, project: project, name: "tool_two")

      {:ok, updated} = Workbenches.update_workbench(%{
        name: workbench.name,
        tool_associations: [%{tool_id: tool1.id}, %{tool_id: tool2.id}]
      }, workbench.id, user)

      updated = Console.Repo.preload(updated, :tools)
      assert length(updated.tools) == 2
      assert ids_equal(updated.tools, [tool1, tool2])
    end

    test "project writers can replace tool associations on update" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      tool1 = insert(:workbench_tool, project: project, name: "tool_first")
      tool2 = insert(:workbench_tool, project: project, name: "tool_second")
      workbench = insert(:workbench, project: project)
      insert(:workbench_tool_association, workbench: workbench, tool: tool1)

      {:ok, updated} = Workbenches.update_workbench(%{
        name: workbench.name,
        tool_associations: [%{tool_id: tool2.id}]
      }, workbench.id, user)

      updated = Console.Repo.preload(updated, :tools)
      assert length(updated.tools) == 1
      assert hd(updated.tools).id == tool2.id
    end
  end

  describe "delete_workbench/2" do
    test "project writers can delete a workbench" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:ok, deleted} = Workbenches.delete_workbench(workbench.id, user)

      assert deleted.id == workbench.id
      refute refetch(workbench)
      assert_receive {:event, %PubSub.WorkbenchDeleted{item: ^deleted}}
    end

    test "project readers cannot delete a workbench" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:error, _} = Workbenches.delete_workbench(workbench.id, user)

      assert refetch(workbench)
    end
  end

  describe "create_tool/2" do
    test "project writers can create a tool" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, tool} = Workbenches.create_tool(%{
        name: "my_http_tool",
        tool: :http,
        project_id: project.id,
        configuration: %{
          http: %{
            url: "https://example.com",
            method: :post,
            headers: [],
            body: "{}",
            input_schema: %{
              "type" => "object",
              "properties" => %{},
              "required" => []
            }
          }
        }
      }, user)

      assert tool.project_id == project.id
      assert tool.name == "my_http_tool"
      assert tool.tool == :http
      assert_receive {:event, %PubSub.WorkbenchToolCreated{item: ^tool}}
    end

    test "project readers cannot create a tool" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])

      {:error, _} = Workbenches.create_tool(%{
        name: "readonly_tool",
        tool: :http,
        project_id: project.id,
        configuration: %{
          http: %{
            url: "https://example.com",
            method: :get,
            headers: [],
            body: "",
            input_schema: %{"type" => "object", "properties" => %{}, "required" => []}
          }
        }
      }, user)
    end
  end

  describe "update_tool/3" do
    test "project writers can update a tool" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      tool = insert(:workbench_tool, project: project)

      {:ok, updated} = Workbenches.update_tool(%{
        configuration: %{
          http: %{
            url: "https://updated.com",
            method: :get,
            headers: [],
            body: "",
            input_schema: %{"type" => "object", "properties" => %{}, "required" => []}
          }
        }
      }, tool.id, user)

      assert updated.id == tool.id
      assert_receive {:event, %PubSub.WorkbenchToolUpdated{item: ^updated}}
    end

    test "project readers cannot update a tool" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      tool = insert(:workbench_tool, project: project)

      {:error, _} = Workbenches.update_tool(%{
        configuration: %{
          http: %{
            url: "https://updated.com",
            method: :get,
            headers: [],
            body: "",
            input_schema: %{"type" => "object", "properties" => %{}, "required" => []}
          }
        }
      }, tool.id, user)

      assert refetch(tool)
    end
  end

  describe "delete_tool/2" do
    test "project writers can delete a tool" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      tool = insert(:workbench_tool, project: project)

      {:ok, deleted} = Workbenches.delete_tool(tool.id, user)

      assert deleted.id == tool.id
      refute refetch(tool)
      assert_receive {:event, %PubSub.WorkbenchToolDeleted{item: ^deleted}}
    end

    test "project readers cannot delete a tool" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      tool = insert(:workbench_tool, project: project)

      {:error, _} = Workbenches.delete_tool(tool.id, user)

      assert refetch(tool)
    end
  end

  describe "create_workbench_job/3" do
    test "users with read access can create a job" do
      user = insert(:user)
      project = insert(:project)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}], project: project)

      {:ok, job} = Workbenches.create_workbench_job(%{prompt: "test prompt"}, workbench.id, user)

      assert job.workbench_id == workbench.id
      assert job.status == :pending
      assert job.prompt == "test prompt"
      assert job.user_id == user.id
      assert_receive {:event, %PubSub.WorkbenchJobCreated{item: ^job}}
    end

    test "users without read access cannot create a job" do
      user = insert(:user)
      workbench = insert(:workbench)

      {:error, _} = Workbenches.create_workbench_job(%{prompt: "test prompt"}, workbench.id, user)
    end
  end

  describe "create_job_activity/2" do
    test "creates an activity and sets job status to running" do
      job = insert(:workbench_job, status: :pending)

      {:ok, activity} =
        Workbenches.create_job_activity(
          %{status: :running, type: :coding, prompt: "analyze the repo"},
          job
        )

      assert activity.workbench_job_id == job.id
      assert activity.status == :running
      assert activity.type == :coding
      assert activity.prompt == "analyze the repo"

      job = refetch(job)
      assert job.status == :running
    end

    test "creates an activity with required fields only" do
      job = insert(:workbench_job)

      {:ok, activity} =
        Workbenches.create_job_activity(
          %{status: :pending, type: :memo, prompt: "test prompt"},
          job
        )

      assert activity.workbench_job_id == job.id
      assert activity.status == :pending
      assert activity.type == :memo
    end
  end

  describe "update_job_activity/3" do
    test "updates an activity and refreshes job updated_at and status to running" do
      job = insert(:workbench_job, status: :pending)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :coding, status: :running)

      {:ok, updated} =
        Workbenches.update_job_activity(
          %{status: :successful, prompt: "completed analysis"},
          activity
        )

      assert updated.id == activity.id
      assert updated.status == :successful
      assert updated.prompt == "completed analysis"

      job = refetch(job)
      assert job.updated_at
      assert job.status == :running
    end

    test "updates only the given attributes" do
      job = insert(:workbench_job)
      activity =
        insert(:workbench_job_activity, workbench_job: job, type: :observability, status: :pending)

      {:ok, updated} =
        Workbenches.update_job_activity(%{status: :failed}, activity)

      assert updated.id == activity.id
      assert updated.status == :failed
      assert updated.type == :observability

      assert refetch(job).updated_at
    end
  end

  describe "update_job_status/2" do
    test "updates the job result and creates a memo activity" do
      job = insert(:workbench_job, result: %{working_theory: "old theory", conclusion: "old conclusion"})

      {:ok, activity} =
        Workbenches.update_job_status(
          %{
            prompt: "status update",
            output: "summary",
            status: %{working_theory: "new theory", conclusion: "new conclusion"}
          },
          job
        )

      assert activity.workbench_job_id == job.id
      assert activity.status == :successful
      assert activity.type == :memo
      assert activity.prompt == "status update"
      assert activity.result.output == "summary"

      result = refetch(job.result)
      assert result.working_theory == "new theory"
      assert result.conclusion == "new conclusion"
    end

    test "creates a result when job has no results yet" do
      job = insert(:workbench_job)

      {:ok, activity} =
        Workbenches.update_job_status(
          %{
            prompt: "initial status",
            output: "done",
            status: %{working_theory: "theory", conclusion: "conclusion"}
          },
          job
        )

      assert activity.workbench_job_id == job.id
      assert activity.type == :memo

      job = Console.Repo.preload(refetch(job), :result)
      assert job.result.working_theory == "theory"
      assert job.result.conclusion == "conclusion"
    end
  end

  describe "complete_job/2" do
    test "sets job status to successful and completed_at" do
      job = insert(:workbench_job, status: :running)

      {:ok, completed} = Workbenches.complete_job("Final conclusion.", job)

      assert completed.id == job.id
      assert completed.status == :successful
      assert completed.completed_at

      job = refetch(job)
      assert job.status == :successful
      assert job.completed_at
    end

    test "updates the job result conclusion" do
      job = insert(:workbench_job, status: :running, result: build(:workbench_job_result, conclusion: "old conclusion"))

      {:ok, completed} = Workbenches.complete_job("New final conclusion.", job)

      assert completed.id == job.id
      assert completed.status == :successful
      assert completed.completed_at

      assert completed.result.conclusion == "New final conclusion."
    end

    test "persists conclusion when job has existing result with working_theory" do
      job = insert(:workbench_job, status: :running, result: build(:workbench_job_result, working_theory: "theory", conclusion: ""))

      {:ok, completed} = Workbenches.complete_job("Done.", job)

      assert completed.id == job.id
      assert completed.status == :successful
      assert completed.completed_at

      assert completed.result.conclusion == "Done."
      assert completed.result.working_theory == "theory"
    end
  end
end
