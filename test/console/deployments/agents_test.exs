defmodule Console.Deployments.AgentsTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Agents
  alias Console.PubSub
  alias Console.Schema.{WorkbenchJobActivity, WorkbenchJobActivityAgentRun}
  use Mimic

  describe "upsert_agent_runtime/3" do
    test "it can create a new agent run" do
      cluster = insert(:cluster)
      user    = insert(:user)
      group   = insert(:group)

      {:ok, runtime} = Agents.upsert_agent_runtime(%{
        name: "test",
        type: :claude,
        create_bindings: [
          %{user_email: user.email},
          %{group_name: group.name}
        ]
      }, cluster)

      assert runtime.name == "test"
      assert length(runtime.create_bindings) == 2
      assert Enum.any?(runtime.create_bindings, & &1.user_id == user.id)
      assert Enum.any?(runtime.create_bindings, & &1.group_id == group.id)
    end

    test "it can handle existing agent runtimes" do
      cluster = insert(:cluster)
      user = insert(:user)
      group = insert(:group)
      runtime = insert(:agent_runtime,
        cluster: cluster,
        create_bindings: [%{user_id: user.id}]
      )

      {:ok, updated} = Agents.upsert_agent_runtime(%{
        name: runtime.name,
        create_bindings: [
          %{user_email: user.email},
          %{group_name: group.name}
        ]
      }, cluster)

      assert updated.id == runtime.id
      assert updated.name == runtime.name
      assert length(updated.create_bindings) == 2
      assert Enum.any?(updated.create_bindings, & &1.user_id == user.id)
      assert Enum.any?(updated.create_bindings, & &1.group_id == group.id)
    end

    test "it cannot create multiple default runtimes" do
      cluster = insert(:cluster)
      insert(:agent_runtime, cluster: cluster, default: true)

      {:error, _} = Agents.upsert_agent_runtime(%{
        name: "test",
        default: true
      }, cluster)
    end

    test "it resolves an scm connection name to a connection id" do
      cluster = insert(:cluster)
      conn = insert(:scm_connection, name: "github")

      {:ok, runtime} = Agents.upsert_agent_runtime(%{
        name: "test",
        type: :claude,
        scm_connection: conn.name
      }, cluster)

      assert runtime.connection_id == conn.id
    end

    test "it rejects unknown scm connection names" do
      cluster = insert(:cluster)

      {:error, msg} = Agents.upsert_agent_runtime(%{
        name: "test",
        type: :claude,
        scm_connection: "missing"
      }, cluster)

      assert msg == "could not find scm connection missing"
    end
  end

  describe "delete_agent_runtime/2" do
    test "clusters can delete their own agent runtimes" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster)

      {:ok, del} = Agents.delete_agent_runtime(runtime.id, cluster)

      assert del.id == runtime.id
      refute refetch(runtime)
    end

    test "clusters cannot delete other's agent runtimes" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: insert(:cluster))

      {:error, _} = Agents.delete_agent_runtime(runtime.id, cluster)

      assert refetch(runtime)
    end
  end

  describe "create_agent_run/3" do
    test "users with permissions can create agent runs" do
      user = insert(:user)
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster, create_bindings: [%{user_id: user.id}])

      {:ok, run} = Agents.create_agent_run(%{
        prompt: "hello world",
        mode: :write,
        repository: "https://github.com/pluralsh/console.git",
      }, runtime.id, user)

      assert run.runtime_id == runtime.id
      assert run.user_id == user.id
      assert run.mode == :write
      assert run.status == :pending

      assert_receive {:event, %PubSub.AgentRunCreated{item: ^run}}
    end

    test "it can create an agent run for a repository that is allowed" do
      user    = admin_user()
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster, allowed_repositories: ["https://github.com/pluralsh/console.git"])

      {:ok, run} = Agents.create_agent_run(%{
        prompt: "hello world",
        mode: :write,
        repository: "https://github.com/pluralsh/console.git",
      }, runtime.id, user)

      assert run.runtime_id == runtime.id
      assert run.user_id == user.id
      assert run.mode == :write
      assert run.status == :pending

      assert_receive {:event, %PubSub.AgentRunCreated{item: ^run}}
    end

    test "it can create an agent run when submitting an ssh url against an https allowed list" do
      user    = admin_user()
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster, allowed_repositories: ["https://github.com/pluralsh/console.git"])

      {:ok, run} = Agents.create_agent_run(%{
        prompt: "hello world",
        mode: :write,
        repository: "git@github.com:pluralsh/console.git",
      }, runtime.id, user)

      assert run.runtime_id == runtime.id
    end

    test "it can create an agent run when submitting an https url against an ssh allowed list" do
      user    = admin_user()
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster, allowed_repositories: ["git@github.com:pluralsh/console.git"])

      {:ok, run} = Agents.create_agent_run(%{
        prompt: "hello world",
        mode: :write,
        repository: "https://github.com/pluralsh/console.git",
      }, runtime.id, user)

      assert run.runtime_id == runtime.id
    end

    test "it cannot create an agent run for a repository that is not allowed" do
      user    = admin_user()
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster, allowed_repositories: ["https://github.com/pluralsh/console.git"])

      {:error, _} = Agents.create_agent_run(%{
        prompt: "hello world",
        repository: "https://github.com/pluralsh/plural.git",
      }, runtime.id, user)
    end

    test "users without permissions cannot create agent runs" do
      user = insert(:user)
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster)

      {:error, _} = Agents.create_agent_run(%{
        prompt: "hello world",
        repository: "https://github.com/pluralsh/console.git",
      }, runtime.id, user)
    end

    test "it associates a workbench activity when activity is passed" do
      user = insert(:user)
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster, create_bindings: [%{user_id: user.id}])
      job = insert(:workbench_job)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :coding)

      {:ok, run} =
        Agents.create_agent_run(
          %{
            prompt: "hello world",
            mode: :write,
            repository: "https://github.com/pluralsh/console.git",
            activity: activity
          },
          runtime.id,
          user
        )

      assert Repo.get_by(WorkbenchJobActivityAgentRun,
               agent_run_id: run.id,
               workbench_job_activity_id: activity.id
             )

      assert %WorkbenchJobActivity{agent_run_id: run_agent_id, status: :running} =
               Repo.get!(WorkbenchJobActivity, activity.id)

      assert run_agent_id == run.id

      assert_receive {:event, %PubSub.AgentRunCreated{item: ^run}}
    end
  end

  describe "update_agent_run/3" do
    test "clusters can update their own agent runs" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster)
      run = insert(:agent_run, runtime: runtime)

      {:ok, updated} = Agents.update_agent_run(%{
        pod_reference: %{namespace: "ns", name: "name"},
        status: :running,
      }, run.id, cluster)

      assert updated.id == run.id
      assert updated.pod_reference.namespace == "ns"
      assert updated.pod_reference.name == "name"
      assert updated.status == :running
    end

    test "it can update agent run messages" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster)
      run = insert(:agent_run, runtime: runtime)

      {:ok, updated} = Agents.update_agent_run(%{
        pod_reference: %{namespace: "ns", name: "name"},
        status: :running,
        messages: [%{role: :user, message: "a message"}]
      }, run.id, cluster)

      assert updated.id == run.id
      assert updated.pod_reference.namespace == "ns"
      assert updated.pod_reference.name == "name"
      assert updated.status == :running
    end

    test "clusters cannot update other's agent runs" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: insert(:cluster))
      run = insert(:agent_run, runtime: runtime)

      {:error, _} = Agents.update_agent_run(%{
        status: :running,
        pod_reference: %{namespace: "ns", name: "name"},
      }, run.id, cluster)
    end
  end

  describe "cancel_agent_run/2" do
    test "users can cancel their own agent runs" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      run = insert(:agent_run, runtime: runtime, user: user)

      {:ok, cancelled} = Agents.cancel_agent_run(run.id, user)

      assert cancelled.id == run.id
      assert cancelled.status == :cancelled
    end

    test "users cannot cancel other's agent runs" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      run = insert(:agent_run, runtime: runtime, user: insert(:user))

      {:error, _} = Agents.cancel_agent_run(run.id, user)
    end
  end

  describe "agent_pull_request/3" do
    test "it can create a pull request" do
      user    = insert(:user)
      runtime = insert(:agent_runtime, cluster: insert(:cluster))
      run     = insert(:agent_run, runtime: runtime, flow: insert(:flow), user: user)
      insert(:scm_connection, default: true)

      expect(Console.Deployments.Pr.Dispatcher, :pr, fn _, "a pr", "a body", "https://github.com/pluralsh/console.git", "main", "plrl/ai/pr-test" ->
        {:ok, %{url: "https://github.com/pr/url", title: "a pr"}}
      end)

      {:ok, pr} = Agents.agent_pull_request(%{
        title: "a pr",
        body: "a body",
        repository: "https://github.com/pluralsh/console.git",
        base: "main",
        head: "plrl/ai/pr-test"
      }, run.id, user)

      assert pr.status == :open
      assert pr.title == "a pr"
      assert pr.flow_id == run.flow_id
      assert pr.agent_run_id == run.id

      assert_receive {:event, %PubSub.PullRequestCreated{item: ^pr}}
    end

    test "it can create a pull request associated with a runs agent session" do
      user    = insert(:user)
      session = insert(:agent_session)
      runtime = insert(:agent_runtime, cluster: insert(:cluster))
      run     = insert(:agent_run, runtime: runtime, flow: insert(:flow), user: user, session: session)
      insert(:scm_connection, default: true)

      expect(Console.Deployments.Pr.Dispatcher, :pr, fn _, "a pr", "a body", "https://github.com/pluralsh/console.git", "main", "plrl/ai/pr-test" ->
        {:ok, %{url: "https://github.com/pr/url", title: "a pr"}}
      end)

      {:ok, pr} = Agents.agent_pull_request(%{
        title: "a pr",
        body: "a body",
        repository: "https://github.com/pluralsh/console.git",
        base: "main",
        head: "plrl/ai/pr-test"
      }, run.id, user)

      assert pr.status == :open
      assert pr.title == "a pr"
      assert pr.flow_id == run.flow_id
      assert pr.agent_run_id == run.id
      assert pr.session_id == session.id
    end

    test "it sets workbench_job_id when the agent run is linked to a job activity" do
      user = insert(:user)
      runtime = insert(:agent_runtime, cluster: insert(:cluster))

      run =
        insert(:agent_run,
          runtime: runtime,
          flow: insert(:flow),
          user: user
        )

      job = insert(:workbench_job)
      activity = insert(:workbench_job_activity, workbench_job: job)

      {:ok, _} =
        %WorkbenchJobActivityAgentRun{}
        |> WorkbenchJobActivityAgentRun.changeset(%{
          workbench_job_activity_id: activity.id,
          agent_run_id: run.id
        })
        |> Repo.insert()

      insert(:scm_connection, default: true)

      expect(Console.Deployments.Pr.Dispatcher, :pr, fn _, "a pr", "a body", "https://github.com/pluralsh/console.git",
                                                      "main", "plrl/ai/pr-test" ->
        {:ok, %{url: "https://github.com/pr/url", title: "a pr"}}
      end)

      {:ok, pr} =
        Agents.agent_pull_request(
          %{
            title: "a pr",
            body: "a body",
            repository: "https://github.com/pluralsh/console.git",
            base: "main",
            head: "plrl/ai/pr-test"
          },
          run.id,
          user
        )

      assert pr.workbench_job_id == job.id
      assert pr.agent_run_id == run.id
      assert_receive {:event, %PubSub.PullRequestCreated{item: ^pr}}
    end

    test "other users cannot create pull requests" do
      user = insert(:user)
      runtime = insert(:agent_runtime, cluster: insert(:cluster))
      run = insert(:agent_run, runtime: runtime, flow: insert(:flow), user: insert(:user))
      insert(:scm_connection, default: true)

      {:error, _} = Agents.agent_pull_request(%{
        title: "a pr",
        body: "a body",
        repository: "https://github.com/pluralsh/console.git",
        base: "main",
        head: "plrl/ai/pr-test"
      }, run.id, user)
    end

    test "it uses the runtime's bound scm connection" do
      user = insert(:user)
      default = insert(:scm_connection, default: true, token: "default-token")
      runtime_conn = insert(:scm_connection, name: "runtime-github", token: "runtime-token")
      runtime = insert(:agent_runtime, cluster: insert(:cluster), connection: runtime_conn)
      run = insert(:agent_run, runtime: runtime, flow: insert(:flow), user: user)

      expect(Console.Deployments.Pr.Dispatcher, :pr, fn conn, "a pr", "a body", _, "main", "plrl/ai/pr-test" ->
        assert conn.id == runtime_conn.id
        assert conn.token == "runtime-token"
        refute conn.id == default.id
        {:ok, %{url: "https://github.com/pr/url", title: "a pr"}}
      end)

      {:ok, pr} = Agents.agent_pull_request(%{
        title: "a pr",
        body: "a body",
        repository: "https://github.com/pluralsh/console.git",
        base: "main",
        head: "plrl/ai/pr-test"
      }, run.id, user)

      assert pr.agent_run_id == run.id
    end
  end

  describe "scm_creds/2" do
    test "it uses the runtime's bound scm connection" do
      cluster = insert(:cluster)
      default = insert(:scm_connection, default: true, token: "default-token")
      runtime_conn = insert(:scm_connection, name: "runtime-github", token: "runtime-token")
      runtime = insert(:agent_runtime, cluster: cluster, connection: runtime_conn)
      run = insert(:agent_run, runtime: runtime)

      {:ok, creds} = Agents.scm_creds(run, cluster)

      assert creds.token == "runtime-token"
      refute creds.token == default.token
    end
  end

  describe "update_todos/3" do
    test "users can update their own todos" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      run = insert(:agent_run, runtime: runtime, user: user)

      {:ok, updated} = Agents.update_todos([%{
        title: "a todo",
        description: "a description",
        done: false
      }], run.id, user)

      assert updated.id == run.id
      assert length(updated.todos) == 1
      assert hd(updated.todos).title == "a todo"
      assert hd(updated.todos).description == "a description"
      assert hd(updated.todos).done == false
    end

    test "non initiated users cannot update todos" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      run = insert(:agent_run, runtime: runtime, user: insert(:user))

      {:error, _} = Agents.update_todos([%{
        title: "a todo",
        description: "a description",
        done: false
      }], run.id, user)
    end
  end

  describe "update_analysis/3" do
    test "users can update their own analysis" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      run = insert(:agent_run, runtime: runtime, user: user)

      {:ok, updated} = Agents.update_analysis(%{
        summary: "a summary",
        analysis: "a analysis",
        bullets: ["a bullet"]
      }, run.id, user)

      assert updated.id == run.id
      assert updated.analysis.summary == "a summary"
      assert updated.analysis.analysis == "a analysis"
      assert updated.analysis.bullets == ["a bullet"]
    end

    test "non initiated users cannot update analysis" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      run = insert(:agent_run, runtime: runtime, user: insert(:user))

      {:error, _} = Agents.update_analysis(%{
        summary: "a summary",
        analysis: "a analysis",
        bullets: ["a bullet"]
      }, run.id, user)
    end
  end

  describe "#create_prompt/2" do
    test "it can create a prompt" do
      run = insert(:agent_run)

      {:ok, prompt} = Agents.create_prompt("a prompt", run.id)

      assert prompt.prompt == "a prompt"
      assert prompt.agent_run_id == run.id
    end
  end

  describe "share_agent_run/3" do
    test "it can share an agent run" do
      user = insert(:user)
      run = insert(:agent_run, user: user)

      {:ok, shared} = Agents.share_agent_run(run.id, true, user)

      assert shared.id == run.id
      assert shared.shared
    end

    test "it can unshare an agent run" do
      user = insert(:user)
      run = insert(:agent_run, user: user, shared: true)

      {:ok, unshared} = Agents.share_agent_run(run.id, false, user)

      assert unshared.id == run.id
      refute unshared.shared
    end

    test "you can't share other users agent runs" do
      user = insert(:user)
      run = insert(:agent_run)

      {:error, _} = Agents.share_agent_run(run.id, true, user)
    end

    test "you can't unshare other users threads" do
      user = insert(:user)
      run = insert(:agent_run, shared: true)

      {:error, _} = Agents.share_agent_run(run.id, false, user)
    end
  end

  describe "#agent_pull_request" do
    test "it can create and appropriately tie a pull request from an agent run" do
      user = insert(:user)
      session = insert(:agent_session)
      run = insert(:agent_run, user: user, session: session)
      insert(:scm_connection, type: :github, default: true)

      expect(Tentacat.Pulls, :create, fn _, "pluralsh", "console", %{
        head: "plrl/ai/pr-test",
        title: "a pr",
        body: "a body",
        base: "main"
      } ->
        {:ok, %{"html_url" => "https://github.com/pr/url", "user" => %{"login" => "pluralsh"}}, %HTTPoison.Response{}}
      end)

      {:ok, pr} = Agents.agent_pull_request(%{
        title: "a pr",
        body: "a body",
        repository: "https://github.com/pluralsh/console.git",
        base: "main",
        head: "plrl/ai/pr-test"
      }, run.id, user)

      assert pr.id
      assert pr.title == "a pr"
      assert pr.url == "https://github.com/pr/url"
      assert pr.agent_run_id == run.id
      assert pr.session_id == session.id
    end
  end

  describe "agent_run_uploads/3" do
    test "clusters can create uploads for their own agent runs" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster)
      run = insert(:agent_run, runtime: runtime)

      stub(Console, :conf, fn :object_store -> true end)

      {:ok, upload} = Agents.agent_run_uploads(%{}, run.id, cluster)

      assert upload.agent_run_id == run.id
      assert is_nil(upload.session)
      assert is_nil(upload.screen_recording)
      assert is_nil(upload.patch)
    end

    test "clusters cannot create uploads for other's agent runs" do
      run = insert(:agent_run)

      stub(Console, :conf, fn :object_store -> true end)

      {:error, "clusters can only update their own agent runs"} =
        Agents.agent_run_uploads(%{}, run.id, insert(:cluster))
    end
  end

  describe "create_agent_message/3" do
    test "it can create an agent message" do
      runtime = insert(:agent_runtime)
      run = insert(:agent_run, runtime: runtime)

      {:ok, created} = Agents.create_agent_message(%{
        message: "a message",
        role: :user
      }, run.id, runtime.cluster)

      assert created.agent_run_id == run.id
      assert created.role == :user
      assert created.message == "a message"
      assert is_integer(created.seq)

      assert_receive {:event, %PubSub.AgentMessageCreated{item: ^created}}
    end

    test "clusters cannot create agent messages for other's runs" do
      run = insert(:agent_run)

      {:error, _} = Agents.create_agent_message(%{
        message: "a message",
        role: :user
      }, run.id, insert(:cluster))
    end
  end
end
