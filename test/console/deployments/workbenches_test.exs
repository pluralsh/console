defmodule Console.Deployments.WorkbenchesTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.Deployments.Workbenches
  alias Console.Schema.WorkbenchJob

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

    test "fails when name is missing (required)" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:error, %Ecto.Changeset{errors: errors}} =
        Workbenches.create_workbench(%{description: "No name", project_id: project.id}, user)

      assert [name: _] = errors
    end

    test "fails when name is duplicate (unique)" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      insert(:workbench, project: project, name: "already-taken")

      {:error, %Ecto.Changeset{errors: errors}} =
        Workbenches.create_workbench(%{name: "already-taken", project_id: project.id}, user)

      assert [name: _] = errors
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

  describe "create_message/3" do
    test "job owner can create a user message for their job" do
      user = insert(:user)
      job = insert(:workbench_job, user: user)

      {:ok, activity} =
        Workbenches.create_message(%{prompt: "follow-up from user"}, job.id, user)

      assert activity.workbench_job_id == job.id
      assert activity.prompt == "follow-up from user"
      assert activity.type == :user
      assert activity.status == :successful
      assert_receive {:event, %PubSub.WorkbenchJobActivityCreated{item: ^activity}}
    end

    test "job owner can create a message when passing the job struct" do
      user = insert(:user)
      job = insert(:workbench_job, user: user)

      {:ok, activity} =
        Workbenches.create_message(%{prompt: "via struct"}, job, user)

      assert activity.workbench_job_id == job.id
      assert activity.prompt == "via struct"
    end

    test "another user cannot create messages for someone else's job" do
      owner = insert(:user)
      other = insert(:user)
      job = insert(:workbench_job, user: owner)

      assert {:error, "you can only create messages for your own jobs"} =
               Workbenches.create_message(%{prompt: "unauthorized"}, job.id, other)

      refute_receive {:event, %PubSub.WorkbenchJobActivityCreated{}}
    end

    test "creates a message when the job is idle" do
      user = insert(:user)
      job = insert(:workbench_job, user: user, status: :successful)

      assert WorkbenchJob.idle?(job)

      {:ok, activity} =
        Workbenches.create_message(%{prompt: "idle follow-up"}, job, user)

      assert activity.prompt == "idle follow-up"
      assert activity.type == :user
      assert_receive {:event, %PubSub.WorkbenchJobActivityCreated{item: ^activity}}
    end

    test "returns an error when the job is active (not idle)" do
      user = insert(:user)
      job = insert(:workbench_job, user: user, status: :running)

      refute WorkbenchJob.idle?(job)

      assert {:error, "job is currently active, please wait for it to complete before prompting"} =
               Workbenches.create_message(%{prompt: "while running"}, job, user)

      refute_receive {:event, %PubSub.WorkbenchJobActivityCreated{}}
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
      assert_receive {:event, %PubSub.WorkbenchJobActivityCreated{item: ^activity}}

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
      assert_receive {:event, %PubSub.WorkbenchJobActivityCreated{item: ^activity}}
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
      assert_receive {:event, %PubSub.WorkbenchJobActivityUpdated{item: ^updated}}

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
      assert_receive {:event, %PubSub.WorkbenchJobActivityUpdated{item: ^updated}}

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

      {:ok, completed} = Workbenches.complete_job(%{conclusion: "Final conclusion."}, job)

      assert completed.id == job.id
      assert completed.status == :successful
      assert completed.completed_at

      job = refetch(job)
      assert job.status == :successful
      assert job.completed_at
    end

    test "updates the job result conclusion" do
      job = insert(:workbench_job, status: :running, result: build(:workbench_job_result, conclusion: "old conclusion"))

      {:ok, completed} = Workbenches.complete_job(%{conclusion: "New final conclusion."}, job)

      assert completed.id == job.id
      assert completed.status == :successful
      assert completed.completed_at

      assert completed.result.conclusion == "New final conclusion."
    end

    test "persists conclusion when job has existing result with working_theory" do
      job = insert(:workbench_job, status: :running, result: build(:workbench_job_result, working_theory: "theory", conclusion: ""))

      {:ok, completed} = Workbenches.complete_job(%{conclusion: "Done."}, job)

      assert completed.id == job.id
      assert completed.status == :successful
      assert completed.completed_at

      assert completed.result.conclusion == "Done."
      assert completed.result.working_theory == "theory"
    end

    test "persists metadata with metrics alongside conclusion" do
      job = insert(:workbench_job, status: :running)

      {:ok, completed} = Workbenches.complete_job(%{
        conclusion: "Done.",
        metadata: %{
          metrics: [
            %{name: "cpu_usage", value: 0.85, labels: %{"pod" => "web-1"}},
            %{name: "mem_usage", value: 0.60, labels: %{"pod" => "web-1"}}
          ]
        }
      }, job)

      assert completed.result.conclusion == "Done."
      metrics = completed.result.metadata.metrics
      assert length(metrics) == 2
      assert Enum.any?(metrics, & &1.name == "cpu_usage" and &1.value == 0.85)
      assert Enum.any?(metrics, & &1.name == "mem_usage" and &1.value == 0.60)
    end
  end

  describe "fail_job/2" do
    test "sets job status to failed, completed_at, and error message" do
      job = insert(:workbench_job, status: :running)

      {:ok, failed} = Workbenches.fail_job("Something went wrong.", job)

      assert failed.id == job.id
      assert failed.status == :failed
      assert failed.completed_at
      assert failed.error == "Something went wrong."
    end
  end

  describe "create_workbench_cron/3" do
    test "project writers can create a cron" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:ok, cron} = Workbenches.create_workbench_cron(%{
        crontab: "*/5 * * * *",
        prompt: "run analysis"
      }, workbench.id, user)

      assert cron.workbench_id == workbench.id
      assert cron.user_id == user.id
      assert cron.crontab == "*/5 * * * *"
      assert cron.prompt == "run analysis"
      assert cron.next_run_at
      assert_receive {:event, %PubSub.WorkbenchCronCreated{item: ^cron}}
    end

    test "project readers cannot create a cron" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:error, _} = Workbenches.create_workbench_cron(%{
        crontab: "*/5 * * * *",
        prompt: "run"
      }, workbench.id, user)
    end
  end

  describe "update_workbench_cron/3" do
    test "project writers can update a cron" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      cron = insert(:workbench_cron, workbench: workbench, crontab: "0 * * * *", prompt: "old")

      {:ok, updated} = Workbenches.update_workbench_cron(%{
        crontab: "*/10 * * * *",
        prompt: "updated prompt"
      }, cron.id, user)

      assert updated.id == cron.id
      assert updated.crontab == "*/10 * * * *"
      assert updated.prompt == "updated prompt"
      assert_receive {:event, %PubSub.WorkbenchCronUpdated{item: ^updated}}
    end

    test "project readers cannot update a cron" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      cron = insert(:workbench_cron, workbench: workbench)

      {:error, _} = Workbenches.update_workbench_cron(%{
        crontab: "*/10 * * * *",
        prompt: "updated"
      }, cron.id, user)

      assert refetch(cron).crontab != "*/10 * * * *"
    end
  end

  describe "delete_workbench_cron/2" do
    test "project writers can delete a cron" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      cron = insert(:workbench_cron, workbench: workbench)

      {:ok, deleted} = Workbenches.delete_workbench_cron(cron.id, user)

      assert deleted.id == cron.id
      refute refetch(cron)
      assert_receive {:event, %PubSub.WorkbenchCronDeleted{item: ^deleted}}
    end

    test "project readers cannot delete a cron" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      cron = insert(:workbench_cron, workbench: workbench)

      {:error, _} = Workbenches.delete_workbench_cron(cron.id, user)

      assert refetch(cron)
    end
  end

  describe "create_workbench_prompt/3" do
    test "users with read access to the workbench can create a prompt" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:ok, prompt} = Workbenches.create_workbench_prompt(%{prompt: "hello"}, workbench.id, user)

      assert prompt.workbench_id == workbench.id
      assert prompt.prompt == "hello"
      assert_receive {:event, %PubSub.WorkbenchPromptCreated{item: ^prompt}}
    end

    test "users with write access to the workbench can create a prompt" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:ok, prompt} = Workbenches.create_workbench_prompt(%{prompt: "from writer"}, workbench.id, user)

      assert prompt.workbench_id == workbench.id
      assert prompt.prompt == "from writer"
    end

    test "users without workbench access cannot create a prompt" do
      user = insert(:user)
      workbench = insert(:workbench)

      {:error, _} = Workbenches.create_workbench_prompt(%{prompt: "nope"}, workbench.id, user)
    end
  end

  describe "update_workbench_prompt/3" do
    test "users with read access can update a prompt" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      prompt = insert(:workbench_prompt, workbench: workbench, prompt: "old")

      {:ok, updated} = Workbenches.update_workbench_prompt(%{prompt: "new text"}, prompt.id, user)

      assert updated.id == prompt.id
      assert updated.prompt == "new text"
      assert_receive {:event, %PubSub.WorkbenchPromptUpdated{item: ^updated}}
    end

    test "users without access cannot update a prompt" do
      user = insert(:user)
      prompt = insert(:workbench_prompt, prompt: "secret")

      {:error, _} = Workbenches.update_workbench_prompt(%{prompt: "hacked"}, prompt.id, user)

      assert refetch(prompt).prompt == "secret"
    end
  end

  describe "delete_workbench_prompt/2" do
    test "users with read access can delete a prompt" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      prompt = insert(:workbench_prompt, workbench: workbench)

      {:ok, deleted} = Workbenches.delete_workbench_prompt(prompt.id, user)

      assert deleted.id == prompt.id
      refute refetch(prompt)
      assert_receive {:event, %PubSub.WorkbenchPromptDeleted{item: ^deleted}}
    end

    test "users without access cannot delete a prompt" do
      user = insert(:user)
      prompt = insert(:workbench_prompt)

      {:error, _} = Workbenches.delete_workbench_prompt(prompt.id, user)

      assert refetch(prompt)
    end
  end

  describe "create_workbench_webhook/3" do
    test "project writers can create a webhook with observability webhook" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      obs_webhook = insert(:observability_webhook)

      {:ok, webhook} = Workbenches.create_workbench_webhook(%{
        name: "my-webhook",
        webhook_id: obs_webhook.id
      }, workbench.id, user)

      assert webhook.workbench_id == workbench.id
      assert webhook.name == "my-webhook"
      assert webhook.webhook_id == obs_webhook.id
      assert_receive {:event, %PubSub.WorkbenchWebhookCreated{item: ^webhook}}
    end

    test "project writers can create a webhook with issue webhook" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      issue_wh = insert(:issue_webhook)

      {:ok, webhook} = Workbenches.create_workbench_webhook(%{
        name: "issue-webhook-trigger",
        issue_webhook_id: issue_wh.id
      }, workbench.id, user)

      assert webhook.workbench_id == workbench.id
      assert webhook.name == "issue-webhook-trigger"
      assert webhook.issue_webhook_id == issue_wh.id
      assert_receive {:event, %PubSub.WorkbenchWebhookCreated{item: ^webhook}}
    end

    test "project readers cannot create a webhook" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      obs_webhook = insert(:observability_webhook)

      {:error, _} = Workbenches.create_workbench_webhook(%{
        name: "forbidden",
        webhook_id: obs_webhook.id
      }, workbench.id, user)
    end

    test "requires webhook_id or issue_webhook_id" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:error, changeset} = Workbenches.create_workbench_webhook(%{
        name: "no-source"
      }, workbench.id, user)

      assert %{webhook_id: ["must have either webhook_id or issue_webhook_id"]} = errors_on(changeset)
    end
  end

  describe "update_workbench_webhook/3" do
    test "project writers can update a webhook" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      webhook = insert(:workbench_webhook, workbench: workbench, name: "original")

      {:ok, updated} = Workbenches.update_workbench_webhook(%{
        name: "updated-name"
      }, webhook.id, user)

      assert updated.id == webhook.id
      assert updated.name == "updated-name"
      assert_receive {:event, %PubSub.WorkbenchWebhookUpdated{item: ^updated}}
    end

    test "project writers can update a webhook with matches" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      webhook = insert(:workbench_webhook, workbench: workbench, name: "existing")

      {:ok, updated} = Workbenches.update_workbench_webhook(%{
        matches: %{substring: "error", case_insensitive: true}
      }, webhook.id, user)

      assert updated.id == webhook.id
      assert updated.name == "existing"
      assert updated.matches.substring == "error"
      assert updated.matches.case_insensitive == true
      assert_receive {:event, %PubSub.WorkbenchWebhookUpdated{item: ^updated}}
    end

    test "project readers cannot update a webhook" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      webhook = insert(:workbench_webhook, workbench: workbench, name: "original")

      {:error, _} = Workbenches.update_workbench_webhook(%{
        name: "updated"
      }, webhook.id, user)

      assert refetch(webhook).name == "original"
    end
  end

  describe "delete_workbench_webhook/2" do
    test "project writers can delete a webhook" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      webhook = insert(:workbench_webhook, workbench: workbench)

      {:ok, deleted} = Workbenches.delete_workbench_webhook(webhook.id, user)

      assert deleted.id == webhook.id
      refute refetch(webhook)
      assert_receive {:event, %PubSub.WorkbenchWebhookDeleted{item: ^deleted}}
    end

    test "project readers cannot delete a webhook" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      webhook = insert(:workbench_webhook, workbench: workbench)

      {:error, _} = Workbenches.delete_workbench_webhook(webhook.id, user)

      assert refetch(webhook)
    end
  end
end
