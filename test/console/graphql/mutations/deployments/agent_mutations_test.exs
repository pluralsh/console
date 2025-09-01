defmodule Console.GraphQL.Mutations.Deployments.AgentMutationsTest do
  use Console.DataCase, async: true
  use Mimic

  describe "upsertAgentRuntime" do
    test "a cluster can upsert an agent runtime" do
      cluster = insert(:cluster)
      user = insert(:user)

      {:ok, %{data: %{"upsertAgentRuntime" => runtime}}} = run_query("""
        mutation Upsert($attrs: AgentRuntimeAttributes!) {
          upsertAgentRuntime(attributes: $attrs) {
            id
            name
            type
            createBindings { user { id } }
          }
        }
      """, %{"attrs" => %{
        "name" => "test",
        "type" => "CLAUDE",
        "createBindings" => [%{"userEmail" => user.email}]
      }}, %{cluster: cluster})

      assert runtime["id"]
      assert runtime["name"] == "test"
      assert runtime["type"] == "CLAUDE"
      assert hd(runtime["createBindings"])["user"]["id"] == user.id
    end
  end

  describe "deleteAgentRuntime" do
    test "a cluster can delete an agent runtime" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster)

      {:ok, %{data: %{"deleteAgentRuntime" => del}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteAgentRuntime(id: $id) {
            id
          }
        }
      """, %{"id" => runtime.id}, %{cluster: cluster})

      assert del["id"] == runtime.id
      refute refetch(runtime)
    end
  end

  describe "createAgentRun" do
    test "a user can create an agent run" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"createAgentRun" => run}}} = run_query("""
        mutation Create($runtimeId: ID!, $attrs: AgentRunAttributes!) {
          createAgentRun(runtimeId: $runtimeId, attributes: $attrs) {
            id
            prompt
            runtime { id }
            user { id }
          }
        }
      """, %{
        "attrs" => %{"prompt" => "test", "repository" => "https://github.com/pluralsh/console.git"},
        "runtimeId" => runtime.id,
      }, %{current_user: user})

      assert run["id"]
      assert run["prompt"] == "test"
      assert run["runtime"]["id"] == runtime.id
      assert run["user"]["id"] == user.id
    end
  end

  describe "updateAgentRun" do
    test "a cluster can update an agent run" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster)
      run = insert(:agent_run, runtime: runtime)

      {:ok, %{data: %{"updateAgentRun" => found}}} = run_query("""
        mutation Update($id: ID!, $attrs: AgentRunStatusAttributes!) {
          updateAgentRun(id: $id, attributes: $attrs) {
            id
            status
          }
        }
      """, %{"id" => run.id, "attrs" => %{"status" => "RUNNING"}}, %{cluster: cluster})

      assert found["id"] == run.id
      assert found["status"] == "RUNNING"
    end
  end

  describe "cancelAgentRun" do
    test "a user can cancel their own agent run" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      run = insert(:agent_run, runtime: runtime, user: user)

      {:ok, %{data: %{"cancelAgentRun" => found}}} = run_query("""
        mutation Cancel($id: ID!) {
          cancelAgentRun(id: $id) {
            id
            status
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert found["id"] == run.id
      assert found["status"] == "CANCELLED"
    end
  end

  describe "agentPullRequest" do
    test "a user can create a pull request" do
      user    = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      run     = insert(:agent_run, runtime: runtime, flow: insert(:flow), user: user)
      insert(:scm_connection, default: true)

      expect(Console.Deployments.Pr.Dispatcher, :pr, fn _, "a pr", "a body", "https://github.com/pluralsh/console.git", "main", "plrl/ai/pr-test" ->
        {:ok, %{url: "https://github.com/pr/url", title: "a pr"}}
      end)

      {:ok, %{data: %{"agentPullRequest" => pr}}} = run_query("""
        mutation AgentPullRequest($runId: ID!, $attrs: AgentPullRequestAttributes!) {
          agentPullRequest(runId: $runId, attributes: $attrs) {
            id
            title
          }
        }
      """, %{
        "runId" => run.id,
        "attrs" => %{
          "title" => "a pr",
          "body" => "a body",
          "repository" => "https://github.com/pluralsh/console.git",
          "base" => "main",
          "head" => "plrl/ai/pr-test"
        }
      }, %{current_user: user})

      assert pr["id"]
      assert pr["title"] == "a pr"
    end
  end
end
