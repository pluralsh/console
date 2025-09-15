defmodule Console.Deployments.AgentsTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Agents
  alias Console.PubSub
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

    test "users without permissions cannot create agent runs" do
      user = insert(:user)
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster)

      {:error, _} = Agents.create_agent_run(%{
        prompt: "hello world",
        repository: "https://github.com/pluralsh/console.git",
      }, runtime.id, user)
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
end
