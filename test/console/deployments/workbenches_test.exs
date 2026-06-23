defmodule Console.Deployments.WorkbenchesTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.AI.{Provider, Tools.Workbench.SavedPrompt}
  alias Console.PubSub
  alias Console.Deployments.Workbenches
  alias Console.Schema.{WorkbenchJob}

  @usage %{
    input_tokens: 100,
    output_tokens: 25,
    total_tokens: 125,
    cached_tokens: 10,
    reasoning_tokens: 5,
    input_cost: 0.01,
    output_cost: 0.02,
    total_cost: 0.03
  }

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

    test "sets bot_user_id to the creating user by default" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, workbench} =
        Workbenches.create_workbench(%{name: "wb-bot-default", project_id: project.id}, user)

      assert workbench.bot_user_id == user.id
    end

    test "allows an explicit bot_user_id on create" do
      creator = insert(:user)
      bot = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: creator.id}])

      {:ok, workbench} =
        Workbenches.create_workbench(
          %{name: "wb-explicit-bot", project_id: project.id, bot_user_id: bot.id},
          creator
        )

      assert workbench.bot_user_id == bot.id
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

    test "override_bot_user: true sets bot_user_id to the updating user" do
      writer = insert(:user)
      other_bot = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: writer.id}])
      workbench = insert(:workbench, project: project, bot_user: other_bot)

      {:ok, updated} =
        Workbenches.update_workbench(
          %{name: workbench.name, override_bot_user: true},
          workbench.id,
          writer
        )

      assert updated.bot_user_id == writer.id
    end

    test "update can set bot_user_id explicitly when override_bot_user is not true" do
      writer = insert(:user)
      bot_a = insert(:user)
      bot_b = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: writer.id}])
      workbench = insert(:workbench, project: project, bot_user: bot_a)

      {:ok, updated} =
        Workbenches.update_workbench(
          %{name: workbench.name, bot_user_id: bot_b.id},
          workbench.id,
          writer
        )

      assert updated.bot_user_id == bot_b.id
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
    test "project writers can create each tool type with a likely configuration" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      cases = [
        {:http, [configuration: %{http: %{
          url: "https://example.com",
          method: :post,
          headers: [],
          body: "{}",
          input_schema: %{"type" => "object", "properties" => %{}, "required" => []}
        }}], [:integration]},
        {:elastic, [configuration: %{elastic: %{
          url: "https://elastic.example.com",
          username: "elastic",
          password: "elastic-password",
          index: "logs-*"
        }}], [:logs]},
        {:opensearch, [configuration: %{opensearch: %{
          host: "https://opensearch.example.com",
          index: "logs-*",
          use_pod_identity: true
        }}], [:logs]},
        {:datadog, [configuration: %{datadog: %{
          site: "datadoghq.com",
          api_key: "datadog-api-key",
          app_key: "datadog-app-key"
        }}], [:metrics, :logs]},
        {:prometheus, [configuration: %{prometheus: %{
          url: "https://prometheus.example.com",
          token: "prometheus-bearer-token"
        }}], [:metrics]},
        {:loki, [configuration: %{loki: %{
          url: "https://loki.example.com",
          token: "loki-bearer-token"
        }}], [:logs]},
        {:tempo, [configuration: %{tempo: %{
          url: "https://tempo.example.com",
          token: "tempo-bearer-token"
        }}], [:traces]},
        {:jaeger, [configuration: %{jaeger: %{
          url: "https://jaeger.example.com",
          token: "jaeger-bearer-token"
        }}], [:traces]},
        {:splunk, [configuration: %{splunk: %{
          url: "https://splunk.example.com",
          token: "splunk-token"
        }}], [:logs]},
        {:dynatrace, [configuration: %{dynatrace: %{
          url: "https://dynatrace.example.com",
          platform_token: "dynatrace-platform-token"
        }}], [:metrics, :logs, :traces]},
        {:cloudwatch, [configuration: %{cloudwatch: %{
          region: "us-east-1",
          log_group_names: ["/aws/eks/test"]
        }}], [:metrics, :logs]},
        {:azure, [configuration: %{azure: %{
          subscription_id: "subscription-id",
          tenant_id: "tenant-id",
          client_id: "client-id",
          client_secret: "client-secret",
          prometheus_url: "https://prometheus.monitor.azure.com"
        }}], [:metrics, :logs]},
        {:sentry, [configuration: %{sentry: %{
          url: "https://sentry.example.com",
          access_token: "sentry-access-token"
        }}], [:error_tracking]},
        {:linear, [configuration: %{linear: %{
          access_token: "linear-access-token"
        }}], [:ticketing]},
        {:slack, [configuration: %{slack: %{
          bot_token: "xoxb-slack-bot-token"
        }}], [:chat]},
        {:pagerduty, [configuration: %{pagerduty: %{
          api_token: "pagerduty-api-token"
        }}], [:integration]},
        {:teams, [configuration: %{teams: %{
          client_id: "teams-client-id",
          client_secret: "teams-client-secret",
          tenant_id: "teams-tenant-id"
        }}], [:chat]},
        {:atlassian, [configuration: %{atlassian: %{
          email: "jira@example.com",
          api_token: "atlassian-api-token"
        }}], [:ticketing]},
        {:exa, [configuration: %{exa: %{
          api_key: "exa-api-key"
        }}], [:search]},
        {:github, [configuration: %{github: %{
          url: "https://api.github.com",
          access_token: "github-access-token"
        }}], [:scm]},
        {:gitlab, [configuration: %{gitlab: %{
          url: "https://gitlab.com",
          token: "gitlab-token"
        }}], [:scm]},
        {:bitbucket, [configuration: %{bitbucket: %{
          url: "https://api.bitbucket.org/2.0",
          token: "bitbucket-token"
        }}], [:scm]},
        {:bitbucket_datacenter, [configuration: %{bitbucket_datacenter: %{
          url: "https://bitbucket.example.com",
          token: "bitbucket-datacenter-token"
        }}], [:scm]},
        {:azure_devops, [configuration: %{azure_devops: %{
          url: "https://dev.azure.com/plural",
          token: "azure-devops-token"
        }}], [:scm]},
        {:cloud, [cloud_connection_id: insert(:cloud_connection).id], [:infrastructure]},
        {:mcp, [mcp_server_id: insert(:mcp_server, project: project).id], [:integration]}
      ]

      for {tool_type, attrs, categories} <- cases do
        {:ok, tool} =
          attrs
          |> Map.new()
          |> Map.merge(%{name: "#{tool_type}_tool", tool: tool_type, project_id: project.id})
          |> Workbenches.create_tool(user)

        assert tool.project_id == project.id
        assert tool.name == "#{tool_type}_tool"
        assert tool.tool == tool_type
        assert tool.categories == categories
        assert_receive {:event, %PubSub.WorkbenchToolCreated{item: ^tool}}
      end
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

  describe "create_workbench_bot_job/3" do
    test "creates a job as the workbench bot user when set" do
      bot = insert(:user, roles: %{admin: true})
      workbench = insert(:workbench, bot_user: bot)
      hook = insert(:workbench_webhook, workbench: workbench, user: bot)

      {:ok, job} =
        Workbenches.create_workbench_bot_job(%{prompt: "automated prompt"}, workbench.id, hook)

      assert job.workbench_id == workbench.id
      assert job.user_id == bot.id
      assert job.prompt == "automated prompt"
      assert_receive {:event, %PubSub.WorkbenchJobCreated{item: ^job}}
    end

    test "returns an error when the workbench has no bot user" do
      workbench = insert(:workbench, bot_user: nil)
      hook = insert(:workbench_webhook, workbench: workbench, user: nil)

      assert {:error, "workbench webhook does not have a bot user"} =
               Workbenches.create_workbench_bot_job(%{prompt: "nope"}, workbench.id, hook)

      refute_receive {:event, %PubSub.WorkbenchJobCreated{}}
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

    test "users with flow read access can create associated flow jobs without workbench read access" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench)
      insert(:flow_workbench, flow: flow, workbench: workbench)

      {:ok, job} =
        Workbenches.create_workbench_job(
          %{prompt: "test prompt", flow_id: flow.id},
          workbench.id,
          user
        )

      assert job.workbench_id == workbench.id
      assert job.flow_id == flow.id
      assert job.user_id == user.id
      assert_receive {:event, %PubSub.WorkbenchJobCreated{item: ^job}}
    end

    test "users with flow read access cannot create flow jobs for unrelated workbenches" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench)

      assert {:error, "this flow is not associated with the workbench"} =
               Workbenches.create_workbench_job(
                 %{prompt: "test prompt", flow_id: flow.id},
                 workbench.id,
                 user
               )

      refute_receive {:event, %PubSub.WorkbenchJobCreated{}}
    end

    test "creates a workbench job with an associated chatbot message" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      chat_connection = insert(:chat_connection)

      {:ok, job} =
        Workbenches.create_workbench_job(
          %{
            prompt: "from chat",
            chatbot_message: %{
              message: "serialized payload",
              channel: "C01234567",
              chat_connection_id: chat_connection.id
            }
          },
          workbench.id,
          user
        )

      job = Console.Repo.preload(job, :chatbot_message)

      assert job.chatbot_message.message == "serialized payload"
      assert job.chatbot_message.channel == "C01234567"
      assert job.chatbot_message.chat_connection_id == chat_connection.id
      assert job.chatbot_message.workbench_job_id == job.id
    end
  end

  describe "update_workbench_job/3" do
    test "job owner can update result topology and keeps other result fields" do
      user = insert(:user)

      job =
        insert(:workbench_job,
          user: user,
          result:
            build(:workbench_job_result,
              working_theory: "keep me",
              conclusion: "also keep",
              topology: nil
            )
        )

      {:ok, updated} =
        Workbenches.update_workbench_job(
          %{result: %{topology: "graph TD; A-->B"}},
          job.id,
          user
        )

      assert updated.id == job.id
      result = Console.Repo.preload(refetch(updated), :result).result
      assert result.topology == "graph TD; A-->B"
      assert result.working_theory == "keep me"
      assert result.conclusion == "also keep"
    end

    test "job owner can update when passing the job struct" do
      user = insert(:user)
      job = insert(:workbench_job, user: user, result: build(:workbench_job_result, topology: "old"))

      {:ok, updated} =
        Workbenches.update_workbench_job(%{result: %{topology: "new diagram"}}, job, user)

      assert Console.Repo.preload(updated, :result).result.topology == "new diagram"
    end

    test "another user cannot update someone else's job" do
      owner = insert(:user)
      other = insert(:user)
      job = insert(:workbench_job, user: owner)

      {:error, _} = Workbenches.update_workbench_job(
        %{result: %{topology: "hacked"}},
        job.id,
        other
      )

      assert refetch(job.result).topology != "hacked"
    end
  end

  describe "cancel_workbench_job/2" do
    test "job owner can cancel with only read access to the workbench" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      job = insert(:workbench_job, user: user, workbench: workbench, status: :running)

      {:ok, cancelled} = Workbenches.cancel_workbench_job(job.id, user)

      assert cancelled.id == job.id
      assert cancelled.status == :cancelled
      assert refetch(job).status == :cancelled
    end

    test "user with workbench write access can cancel another user's job" do
      owner = insert(:user)
      writer = insert(:user)
      workbench =
        insert(:workbench,
          read_bindings: [%{user_id: owner.id}],
          write_bindings: [%{user_id: writer.id}]
        )

      job = insert(:workbench_job, user: owner, workbench: workbench, status: :running)

      {:ok, cancelled} = Workbenches.cancel_workbench_job(job.id, writer)

      assert cancelled.status == :cancelled
      assert refetch(job).status == :cancelled
    end

    test "user with only read access cannot cancel someone else's job" do
      owner = insert(:user)
      reader = insert(:user)

      workbench =
        insert(:workbench,
          read_bindings: [%{user_id: owner.id}, %{user_id: reader.id}]
        )

      job = insert(:workbench_job, user: owner, workbench: workbench, status: :running)

      assert {:error, "forbidden"} = Workbenches.cancel_workbench_job(job.id, reader)
      assert refetch(job).status == :running
    end
  end

  describe "heartbeat/1" do
    test "sets status to running and refreshes updated_at" do
      job = insert(:workbench_job, status: :pending)
      past = Timex.now() |> Timex.shift(seconds: -30)

      {:ok, job} =
        job
        |> Ecto.Changeset.change(%{updated_at: past})
        |> Console.Repo.update()

      {:ok, updated} = Workbenches.heartbeat(job)

      assert updated.status == :running
      assert Timex.after?(updated.updated_at, past)

      job = refetch(job)
      assert job.status == :running
    end
  end

  describe "pause_job/1" do
    test "marks the job paused, cancels running activities, and notifies subscribers" do
      job = insert(:workbench_job, status: :running)
      activity = insert(:workbench_job_activity, workbench_job: job, status: :running)

      {:ok, paused} = Workbenches.pause_job(job)

      assert paused.id == job.id
      assert paused.status == :paused
      assert refetch(job).status == :paused
      assert refetch(activity).status == :cancelled
      assert_receive {:event, %PubSub.WorkbenchJobUpdated{item: ^paused}}
    end

    test "persists usage when provided" do
      job = insert(:workbench_job, status: :running)

      {:ok, paused} = Workbenches.pause_job(job, @usage)

      assert paused.status == :paused
      assert_usage(paused.usage, @usage)
      assert_usage(refetch(job).usage, @usage)
      assert_receive {:event, %PubSub.WorkbenchJobUpdated{item: ^paused}}
    end
  end

  describe "save_usage/2" do
    test "persists token and cost usage for a job" do
      job = insert(:workbench_job, status: :running)

      {:ok, updated} = Workbenches.save_usage(job, @usage)

      assert updated.id == job.id
      assert updated.status == :running
      assert_usage(updated.usage, @usage)
      assert_usage(refetch(job).usage, @usage)
      assert_receive {:event, %PubSub.WorkbenchJobUpdated{item: ^updated}}
    end
  end

  describe "create_message/3" do
    test "job owner can create a user message for their job" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      job = insert(:workbench_job, user: user, workbench: workbench)

      {:ok, activity} =
        Workbenches.create_message(%{prompt: "follow-up from user"}, job.id, user)

      assert activity.workbench_job_id == job.id
      assert activity.prompt == "follow-up from user"
      assert activity.type == :user
      assert activity.status == :successful
      assert activity.user_id == user.id
      assert_receive {:event, %PubSub.WorkbenchJobActivityCreated{item: ^activity}}

      assert refetch(job).status == :pending
    end

    test "job owner can create a message when passing the job struct" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      job = insert(:workbench_job, user: user, workbench: workbench)

      {:ok, activity} =
        Workbenches.create_message(%{prompt: "via struct"}, job, user)

      assert activity.workbench_job_id == job.id
      assert activity.prompt == "via struct"
    end

    test "user with workbench read access can create messages for someone else's job" do
      owner = insert(:user)
      reader = insert(:user)

      workbench =
        insert(:workbench,
          read_bindings: [%{user_id: owner.id}, %{user_id: reader.id}]
        )

      job = insert(:workbench_job, user: owner, workbench: workbench)

      {:ok, activity} =
        Workbenches.create_message(%{prompt: "reader follow-up"}, job.id, reader)

      assert activity.workbench_job_id == job.id
      assert activity.prompt == "reader follow-up"
      assert activity.user_id == reader.id
      assert refetch(job).user_id == reader.id
    end

    test "user without workbench read access cannot create messages for someone else's job" do
      owner = insert(:user)
      other = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: owner.id}])
      job = insert(:workbench_job, user: owner, workbench: workbench)

      {:error, "forbidden"} = Workbenches.create_message(%{prompt: "unauthorized"}, job.id, other)

      refute_receive {:event, %PubSub.WorkbenchJobActivityCreated{}}
    end

    test "creates a message when the job is idle" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      job = insert(:workbench_job, user: user, workbench: workbench, status: :successful)

      assert WorkbenchJob.idle?(job)

      {:ok, activity} =
        Workbenches.create_message(%{prompt: "idle follow-up"}, job, user)

      assert activity.prompt == "idle follow-up"
      assert activity.type == :user
      assert_receive {:event, %PubSub.WorkbenchJobActivityCreated{item: ^activity}}
    end

    test "returns an error when the job is active (not idle)" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      job = insert(:workbench_job, user: user, workbench: workbench, status: :running)

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

  describe "update_job_activity/2" do
    test "updates an activity" do
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
      assert job.status == :pending
    end

    test "updates only the given attributes" do
      job = insert(:workbench_job)
      job_updated_at = job.updated_at
      activity =
        insert(:workbench_job_activity, workbench_job: job, type: :observability, status: :pending)

      {:ok, updated} =
        Workbenches.update_job_activity(%{status: :failed}, activity)

      assert updated.id == activity.id
      assert updated.status == :failed
      assert updated.type == :observability
      assert_receive {:event, %PubSub.WorkbenchJobActivityUpdated{item: ^updated}}

      assert DateTime.compare(refetch(job).updated_at, job_updated_at) == :eq
    end

    test "persists result.error when attrs include result error" do
      job = insert(:workbench_job)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :search, status: :running)

      error_msg = "search subagent: upstream timeout"

      {:ok, updated} =
        Workbenches.update_job_activity(%{result: %{error: error_msg}}, activity)

      assert updated.id == activity.id
      assert updated.status == :running
      assert updated.result.error == error_msg
      assert_receive {:event, %PubSub.WorkbenchJobActivityUpdated{item: ^updated}}

      reloaded = refetch(updated)
      assert reloaded.result.error == error_msg
    end
  end

  describe "save_canvas/2" do
    test "persists canvas blocks on the activity result and the job result" do
      job = insert(:workbench_job, result: build(:workbench_job_result))
      activity = insert(:workbench_job_activity, workbench_job: job, type: :coding, status: :running)

      blocks = [
        %{
          identifier: "block-1",
          type: :markdown,
          layout: %{x: 0, y: 0, w: 6, h: 4},
          content: %{markdown: "# Saved canvas"}
        }
      ]

      {:ok, activity, updated_job} = Workbenches.save_canvas(blocks, "saved canvas", activity)

      assert updated_job.id == job.id

      assert activity.status == :successful
      assert [block] = activity.result.canvas
      assert activity.result.output == "saved canvas"
      assert block.identifier == "block-1"
      assert block.type == :markdown
      assert block.content.markdown == "# Saved canvas"

      assert [block] = updated_job.result.canvas
      assert block.identifier == "block-1"
      assert block.type == :markdown
      assert block.content.markdown == "# Saved canvas"

      assert_receive {:event, %PubSub.WorkbenchJobActivityUpdated{item: %{id: activity_id}}}
      assert activity_id == activity.id

      assert_receive {:event, %PubSub.WorkbenchJobUpdated{item: %{id: job_id}}}
      assert job_id == updated_job.id
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
      assert_receive {:event, %PubSub.WorkbenchJobUpdated{item: updated_job}}
      assert updated_job.id == job.id
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
      assert_receive {:event, %PubSub.WorkbenchJobUpdated{item: updated_job}}
      assert updated_job.id == job.id
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

      [activity] = Console.Repo.all(Console.Schema.WorkbenchJobActivity)

      assert activity.type == :conclusion
      assert activity.status == :successful
      assert activity.prompt == "completing job..."
      assert activity.result.output == "Final conclusion."
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

    test "persists metadata with metrics query alongside conclusion" do
      job = insert(:workbench_job, status: :running)

      {:ok, completed} = Workbenches.complete_job(%{
        conclusion: "Done.",
        metadata: %{
          metrics_query: %{
            tool_name: "workbench_observability_metrics_prom",
            tool_args: %{query: "avg(cpu_usage)", step: "1m"}
          }
        }
      }, job)

      assert completed.result.conclusion == "Done."
      assert completed.result.metadata.metrics_query.tool_name == "workbench_observability_metrics_prom"
      assert completed.result.metadata.metrics_query.tool_args == %{query: "avg(cpu_usage)", step: "1m"}
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

    test "persists usage when provided" do
      job = insert(:workbench_job, status: :running)

      {:ok, failed} = Workbenches.fail_job("Something went wrong.", job, @usage)

      assert failed.status == :failed
      assert failed.completed_at
      assert failed.error == "Something went wrong."
      assert_usage(failed.usage, @usage)
      assert_usage(refetch(job).usage, @usage)
      assert_receive {:event, %PubSub.WorkbenchJobUpdated{item: ^failed}}
    end
  end

  defp assert_usage(usage, expected) do
    assert usage.input_tokens == expected.input_tokens
    assert usage.output_tokens == expected.output_tokens
    assert usage.total_tokens == expected.total_tokens
    assert usage.cached_tokens == expected.cached_tokens
    assert usage.reasoning_tokens == expected.reasoning_tokens
    assert usage.input_cost == expected.input_cost
    assert usage.output_cost == expected.output_cost
    assert usage.total_cost == expected.total_cost
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
      cron = insert(:workbench_cron, workbench: workbench, user: user, crontab: "0 * * * *", prompt: "old")

      {:ok, updated} = Workbenches.update_workbench_cron(%{
        crontab: "*/10 * * * *",
        prompt: "updated prompt"
      }, cron.id, user)

      assert updated.id == cron.id
      assert updated.crontab == "*/10 * * * *"
      assert updated.prompt == "updated prompt"
      assert_receive {:event, %PubSub.WorkbenchCronUpdated{item: ^updated}}
    end

    test "update rejects user_id for non-admin when assigning another user" do
      writer = insert(:user)
      stranger = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: writer.id}])
      workbench = insert(:workbench, project: project)
      cron = insert(:workbench_cron, workbench: workbench, user: writer)

      assert {:error, "invalid association type"} =
               Workbenches.update_workbench_cron(%{user_id: stranger.id}, cron.id, writer)
    end

    test "admin update rejects user_id when the selected user cannot read the workbench" do
      admin = admin_user()
      stranger = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: admin.id}])
      workbench = insert(:workbench, project: project)
      cron = insert(:workbench_cron, workbench: workbench, user: admin)

      assert {:error, "forbidden"} =
               Workbenches.update_workbench_cron(%{user_id: stranger.id}, cron.id, admin)
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

      {:ok, prompt} = Workbenches.create_workbench_prompt(
        %{prompt: "hello", title: "Hello", category: "General"},
        workbench.id,
        user
      )

      assert prompt.workbench_id == workbench.id
      assert prompt.prompt == "hello"
      assert prompt.title == "Hello"
      assert prompt.category == "General"
      assert_receive {:event, %PubSub.WorkbenchPromptCreated{item: ^prompt}}
    end

    test "users with write access to the workbench can create a prompt" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:ok, prompt} = Workbenches.create_workbench_prompt(
        %{prompt: "from writer", title: "Writer prompt", category: "Jobs"},
        workbench.id,
        user
      )

      assert prompt.workbench_id == workbench.id
      assert prompt.prompt == "from writer"
    end

    test "users without workbench access cannot create a prompt" do
      user = insert(:user)
      workbench = insert(:workbench)

      {:error, _} = Workbenches.create_workbench_prompt(
        %{prompt: "nope", title: "Nope", category: "General"},
        workbench.id,
        user
      )
    end

    test "it backfills title and category from the prompt when omitted" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      expect(Provider, :simple_tool_call, fn msgs, SavedPrompt ->
        assert [{:user, msg}] = msgs
        assert msg =~ "restart the api deployment"

        {:ok, %SavedPrompt{title: "Restart API", category: "Troubleshooting"}}
      end)

      {:ok, prompt} = Workbenches.create_workbench_prompt(
        %{prompt: "restart the api deployment"},
        workbench.id,
        user
      )

      assert prompt.workbench_id == workbench.id
      assert prompt.prompt == "restart the api deployment"
      assert prompt.title == "Restart API"
      assert prompt.category == "Troubleshooting"
      assert_receive {:event, %PubSub.WorkbenchPromptCreated{item: ^prompt}}
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

  describe "create_workbench_skill/3" do
    test "users with write access to the workbench can create a skill" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:ok, skill} =
        Workbenches.create_workbench_skill(
          %{name: "debug-skill", description: "debug helper", contents: "run diagnostics"},
          workbench.id,
          user
        )

      assert skill.workbench_id == workbench.id
      assert skill.name == "debug-skill"
      assert skill.description == "debug helper"
      assert skill.contents == "run diagnostics"
      assert_receive {:event, %PubSub.WorkbenchSkillCreated{item: ^skill}}
    end

    test "users with read access cannot create a skill" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:error, _} =
        Workbenches.create_workbench_skill(
          %{name: "nope", contents: "forbidden"},
          workbench.id,
          user
        )
    end
  end

  describe "update_workbench_skill/3" do
    test "users with write access can update a skill" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      skill = insert(:workbench_skill, workbench: workbench, name: "old", contents: "before")

      {:ok, updated} =
        Workbenches.update_workbench_skill(
          %{name: "new", description: "new desc", contents: "after"},
          skill.id,
          user
        )

      assert updated.id == skill.id
      assert updated.name == "new"
      assert updated.description == "new desc"
      assert updated.contents == "after"
      assert_receive {:event, %PubSub.WorkbenchSkillUpdated{item: ^updated}}
    end

    test "users without write access cannot update a skill" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      skill = insert(:workbench_skill, workbench: workbench, name: "secret", contents: "secret body")

      {:error, _} =
        Workbenches.update_workbench_skill(
          %{name: "hacked", contents: "hacked"},
          skill.id,
          user
        )

      assert refetch(skill).name == "secret"
    end
  end

  describe "delete_workbench_skill/2" do
    test "users with write access can delete a skill" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      skill = insert(:workbench_skill, workbench: workbench)

      {:ok, deleted} = Workbenches.delete_workbench_skill(skill.id, user)

      assert deleted.id == skill.id
      refute refetch(skill)
      assert_receive {:event, %PubSub.WorkbenchSkillDeleted{item: ^deleted}}
    end

    test "users without write access cannot delete a skill" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      skill = insert(:workbench_skill, workbench: workbench)

      {:error, _} = Workbenches.delete_workbench_skill(skill.id, user)

      assert refetch(skill)
    end
  end

  describe "create_workbench_eval/3" do
    test "users with write access to the workbench can create an eval" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:ok, eval} =
        Workbenches.create_workbench_eval(
          %{
            conclusion_rules: "c1",
            prompt_rules: "p1",
            progress_rules: "g1"
          },
          workbench.id,
          user
        )

      assert eval.workbench_id == workbench.id
      assert eval.conclusion_rules == "c1"
      assert eval.prompt_rules == "p1"
      assert eval.progress_rules == "g1"
      assert_receive {:event, %PubSub.WorkbenchEvalCreated{item: ^eval}}
    end

    test "users with read access cannot create an eval" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      {:error, _} =
        Workbenches.create_workbench_eval(
          %{conclusion_rules: "x", prompt_rules: "y", progress_rules: "z"},
          workbench.id,
          user
        )
    end

    test "users without workbench access cannot create an eval" do
      user = insert(:user)
      workbench = insert(:workbench)

      {:error, _} =
        Workbenches.create_workbench_eval(
          %{conclusion_rules: "x", prompt_rules: "y", progress_rules: "z"},
          workbench.id,
          user
        )
    end
  end

  describe "update_workbench_eval/3" do
    test "users with write access can update an eval" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      eval = insert(:workbench_eval, workbench: workbench, conclusion_rules: "old")

      {:ok, updated} =
        Workbenches.update_workbench_eval(
          %{conclusion_rules: "new", prompt_rules: "np", progress_rules: "ng"},
          eval.id,
          user
        )

      assert updated.id == eval.id
      assert updated.conclusion_rules == "new"
      assert updated.prompt_rules == "np"
      assert updated.progress_rules == "ng"
      assert_receive {:event, %PubSub.WorkbenchEvalUpdated{item: ^updated}}
    end

    test "users without write access cannot update an eval" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      eval = insert(:workbench_eval, workbench: workbench, conclusion_rules: "secret")

      {:error, _} =
        Workbenches.update_workbench_eval(
          %{conclusion_rules: "hacked", prompt_rules: "h", progress_rules: "h"},
          eval.id,
          user
        )

      assert refetch(eval).conclusion_rules == "secret"
    end
  end

  describe "delete_workbench_eval/2" do
    test "users with write access can delete an eval" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      eval = insert(:workbench_eval, workbench: workbench)

      {:ok, deleted} = Workbenches.delete_workbench_eval(eval.id, user)

      assert deleted.id == eval.id
      refute refetch(eval)
      assert_receive {:event, %PubSub.WorkbenchEvalDeleted{item: ^deleted}}
    end

    test "users without write access cannot delete an eval" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      eval = insert(:workbench_eval, workbench: workbench)

      {:error, _} = Workbenches.delete_workbench_eval(eval.id, user)

      assert refetch(eval)
    end
  end

  describe "create_workbench_webhook/3" do
    test "project writers can create a webhook with observability webhook" do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      obs_webhook = insert(:observability_webhook, read_bindings: [%{user_id: user.id}])

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
      issue_wh = insert(:issue_webhook, read_bindings: [%{user_id: user.id}])

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
      obs_webhook = insert(:observability_webhook, read_bindings: [%{user_id: user.id}])
      webhook = insert(:workbench_webhook, workbench: workbench, webhook: obs_webhook, name: "original", user: user)

      {:ok, updated} = Workbenches.update_workbench_webhook(%{
        name: "updated-name"
      }, webhook.id, user)

      assert updated.id == webhook.id
      assert updated.name == "updated-name"
      assert_receive {:event, %PubSub.WorkbenchWebhookUpdated{item: ^updated}}
    end

    test "project writers can update a webhook with matches" do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      webhook = insert(:observability_webhook, read_bindings: [%{user_id: user.id}])
      webhook = insert(:workbench_webhook, workbench: workbench, webhook: webhook, user: user, name: "existing")

      {:ok, updated} = Workbenches.update_workbench_webhook(%{
        matches: %{substring: "error", case_insensitive: true}
      }, webhook.id, admin_user())

      assert updated.id == webhook.id
      assert updated.name == "existing"
      assert updated.matches.substring == "error"
      assert updated.matches.case_insensitive == true
      assert_receive {:event, %PubSub.WorkbenchWebhookUpdated{item: ^updated}}
    end

    test "override_webhook_user: true sets user_id to the updating user" do
      writer = insert(:user)
      other_owner = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: writer.id}])
      workbench = insert(:workbench, project: project)
      obs_webhook = insert(:observability_webhook, read_bindings: [%{user_id: writer.id}])
      webhook = insert(:workbench_webhook, workbench: workbench, webhook: obs_webhook, user: other_owner, name: "takeover")

      {:ok, updated} =
        Workbenches.update_workbench_webhook(
          %{override_webhook_user: true},
          webhook.id,
          writer
        )

      assert updated.user_id == writer.id
    end

    test "update can set user_id explicitly when override_webhook_user is not true" do
      admin = admin_user()
      owner_a = insert(:user)
      owner_b = insert(:user)
      project =
        insert(:project,
          write_bindings: [%{user_id: admin.id}],
          read_bindings: [%{user_id: owner_b.id}]
        )

      workbench = insert(:workbench, project: project)
      obs_webhook = insert(:observability_webhook, read_bindings: [%{user_id: admin.id}])
      webhook = insert(:workbench_webhook, workbench: workbench, webhook: obs_webhook, user: owner_a, name: "reassign")

      {:ok, updated} =
        Workbenches.update_workbench_webhook(
          %{user_id: owner_b.id},
          webhook.id,
          admin
        )

      assert updated.user_id == owner_b.id
    end

    test "update rejects user_id for non-admin when assigning another user" do
      writer = insert(:user)
      stranger = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: writer.id}])
      workbench = insert(:workbench, project: project)
      obs_webhook = insert(:observability_webhook, read_bindings: [%{user_id: writer.id}])
      webhook = insert(:workbench_webhook, workbench: workbench, webhook: obs_webhook, user: writer, name: "actor-check")

      assert {:error, "invalid association type"} =
               Workbenches.update_workbench_webhook(%{user_id: stranger.id}, webhook.id, writer)
    end

    test "admin update rejects user_id when the selected user cannot read the workbench" do
      admin = admin_user()
      stranger = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: admin.id}])
      workbench = insert(:workbench, project: project)
      obs_webhook = insert(:observability_webhook, read_bindings: [%{user_id: admin.id}])
      webhook = insert(:workbench_webhook, workbench: workbench, webhook: obs_webhook, user: admin, name: "actor-check")

      assert {:error, "forbidden"} =
               Workbenches.update_workbench_webhook(%{user_id: stranger.id}, webhook.id, admin)
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

  describe "create_workbench_chatbot/3" do
    test "project writers can create a chatbot when they can read the chat connection" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      conn = insert(:chat_connection, read_bindings: [%{user_id: user.id}])
      channel = "C-create-#{System.unique_integer([:positive])}"

      {:ok, bot} =
        Workbenches.create_workbench_chatbot(
          %{chat_connection_id: conn.id, channel: channel},
          workbench.id,
          user
        )

      assert bot.workbench_id == workbench.id
      assert bot.chat_connection_id == conn.id
      assert bot.channel == channel
      assert bot.user_id == user.id
      assert_receive {:event, %PubSub.WorkbenchChatbotCreated{item: ^bot}}
    end

    test "project readers cannot create a chatbot" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      conn = insert(:chat_connection, read_bindings: [%{user_id: user.id}])

      {:error, _} =
        Workbenches.create_workbench_chatbot(
          %{chat_connection_id: conn.id, channel: "C-forbidden-#{System.unique_integer([:positive])}"},
          workbench.id,
          user
        )
    end

    test "project writers cannot create a chatbot for a chat connection they cannot read" do
      user = insert(:user)
      other = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      conn = insert(:chat_connection, read_bindings: [%{user_id: other.id}])

      {:error, _} =
        Workbenches.create_workbench_chatbot(
          %{chat_connection_id: conn.id, channel: "C-denied-#{System.unique_integer([:positive])}"},
          workbench.id,
          user
        )
    end
  end

  describe "update_workbench_chatbot/3" do
    test "project writers can update a chatbot" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      conn = insert(:chat_connection, read_bindings: [%{user_id: user.id}])
      channel_a = "C-up-a-#{System.unique_integer([:positive])}"
      channel_b = "C-up-b-#{System.unique_integer([:positive])}"

      bot =
        insert(:workbench_chatbot,
          workbench: workbench,
          chat_connection: conn,
          user: user,
          channel: channel_a
        )

      {:ok, updated} =
        Workbenches.update_workbench_chatbot(%{channel: channel_b}, bot.id, user)

      assert updated.id == bot.id
      assert updated.channel == channel_b
      assert_receive {:event, %PubSub.WorkbenchChatbotUpdated{item: ^updated}}
    end

    test "override_chatbot_user: true sets user_id to the updating user" do
      writer = insert(:user)
      other_owner = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: writer.id}])
      workbench = insert(:workbench, project: project)
      conn = insert(:chat_connection, read_bindings: [%{user_id: writer.id}])

      bot =
        insert(:workbench_chatbot,
          workbench: workbench,
          chat_connection: conn,
          user: other_owner,
          channel: "C-override-#{System.unique_integer([:positive])}"
        )

      {:ok, updated} =
        Workbenches.update_workbench_chatbot(
          %{override_chatbot_user: true},
          bot.id,
          writer
        )

      assert updated.user_id == writer.id
    end

    test "project readers cannot update a chatbot" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      conn = insert(:chat_connection)
      channel = "C-read-only-#{System.unique_integer([:positive])}"

      bot =
        insert(:workbench_chatbot,
          workbench: workbench,
          chat_connection: conn,
          user: insert(:user),
          channel: channel
        )

      {:error, _} =
        Workbenches.update_workbench_chatbot(
          %{channel: "C-never-applied-#{System.unique_integer([:positive])}"},
          bot.id,
          user
        )

      assert refetch(bot).channel == channel
    end

    test "project writers cannot update to a chat connection they cannot read" do
      user = insert(:user)
      other = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      allowed_conn = insert(:chat_connection, read_bindings: [%{user_id: user.id}])
      denied_conn = insert(:chat_connection, read_bindings: [%{user_id: other.id}])

      bot =
        insert(:workbench_chatbot,
          workbench: workbench,
          chat_connection: allowed_conn,
          user: user,
          channel: "C-switch-#{System.unique_integer([:positive])}"
        )

      {:error, _} =
        Workbenches.update_workbench_chatbot(
          %{chat_connection_id: denied_conn.id},
          bot.id,
          user
        )

      assert refetch(bot).chat_connection_id == allowed_conn.id
    end

    test "update rejects user_id for non-admin when assigning another user" do
      writer = insert(:user)
      stranger = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: writer.id}])
      workbench = insert(:workbench, project: project)
      conn = insert(:chat_connection, read_bindings: [%{user_id: writer.id}])

      bot =
        insert(:workbench_chatbot,
          workbench: workbench,
          chat_connection: conn,
          user: writer,
          channel: "C-actor-#{System.unique_integer([:positive])}"
        )

      assert {:error, "invalid association type"} =
               Workbenches.update_workbench_chatbot(%{user_id: stranger.id}, bot.id, writer)
    end

    test "admin update rejects user_id when the selected user cannot read the workbench" do
      admin = admin_user()
      stranger = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: admin.id}])
      workbench = insert(:workbench, project: project)
      conn = insert(:chat_connection, read_bindings: [%{user_id: admin.id}])

      bot =
        insert(:workbench_chatbot,
          workbench: workbench,
          chat_connection: conn,
          user: admin,
          channel: "C-actor-admin-#{System.unique_integer([:positive])}"
        )

      assert {:error, "forbidden"} =
               Workbenches.update_workbench_chatbot(%{user_id: stranger.id}, bot.id, admin)
    end
  end

  describe "delete_workbench_chatbot/2" do
    test "project writers can delete a chatbot" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      conn = insert(:chat_connection, read_bindings: [%{user_id: user.id}])

      bot =
        insert(:workbench_chatbot,
          workbench: workbench,
          chat_connection: conn,
          user: user,
          channel: "C-del-#{System.unique_integer([:positive])}"
        )

      {:ok, deleted} = Workbenches.delete_workbench_chatbot(bot.id, user)

      assert deleted.id == bot.id
      refute refetch(bot)
      assert_receive {:event, %PubSub.WorkbenchChatbotDeleted{item: ^deleted}}
    end

    test "project readers cannot delete a chatbot" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      bot =
        insert(:workbench_chatbot,
          workbench: workbench,
          channel: "C-no-del-#{System.unique_integer([:positive])}"
        )

      {:error, _} = Workbenches.delete_workbench_chatbot(bot.id, user)

      assert refetch(bot)
    end
  end
end
