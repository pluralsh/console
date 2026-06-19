defmodule Console.GraphQL.Queries.Deployments.AgentQueriesTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Workbenches

  describe "agentRuntimes" do
    test "it can list runtimes a user can access" do
      user = insert(:user)
      runtimes = insert_list(3, :agent_runtime, create_bindings: [%{user_id: user.id}])
      insert_list(3, :agent_runtime)

      {:ok, %{data: %{"agentRuntimes" => found}}} = run_query("""
        query {
          agentRuntimes(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: Console.Services.Rbac.preload(user)})

      assert from_connection(found)
             |> ids_equal(runtimes)
    end
  end

  describe "agentRuns" do
    test "it can list a users runs" do
      user = insert(:user)
      runs = insert_list(3, :agent_run, user: user)
      insert_list(3, :agent_run)

      {:ok, %{data: %{"agentRuns" => found}}} = run_query("""
        query {
          agentRuns(first: 5) { edges { node { id } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(runs)
    end

    test "it can filter runs by status" do
      user = insert(:user)
      pending_approval = insert_list(2, :agent_run, user: user, status: :pending_approval)
      insert_list(2, :agent_run, user: user, status: :running)
      insert_list(2, :agent_run, status: :pending_approval)

      {:ok, %{data: %{"agentRuns" => found}}} = run_query("""
        query AgentRuns($status: AgentRunStatus!) {
          agentRuns(first: 10, status: $status) {
            edges { node { id status } }
          }
        }
      """, %{"status" => "PENDING_APPROVAL"}, %{current_user: user})

      nodes = from_connection(found)
      assert length(nodes) == 2
      assert Enum.all?(nodes, &(&1["status"] == "PENDING_APPROVAL"))
      assert ids_equal(nodes, pending_approval)
    end
  end

  describe "agentRun" do
    test "a user can fetch a run they can read" do
      user = insert(:user)
      run = insert(:agent_run, user: user)
      ignore = insert(:agent_run)

      {:ok, %{data: %{"agentRun" => found}}} = run_query("""
        query AgentRun($id: ID!) {
          agentRun(id: $id) { id }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert found["id"] == run.id

      {:ok, %{errors: [_ | _]}} = run_query("""
        query AgentRun($id: ID!) {
          agentRun(id: $id) { id }
        }
      """, %{"id" => ignore.id}, %{current_user: user})
    end

    test "a cluster can fetch a run they are the runner cluster for" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster)
      run = insert(:agent_run, runtime: runtime)
      conn = insert(:scm_connection, default: true)

      {:ok, %{data: %{"agentRun" => found}}} = run_query("""
        query AgentRun($id: ID!) {
          agentRun(id: $id) {
            id
            scmCreds {
              username
              token
            }
            pluralCreds {
              token
              url
            }
          }
        }
      """, %{"id" => run.id}, %{cluster: cluster})

      assert found["id"] == run.id
      assert found["scmCreds"]["username"] == "apikey"
      assert found["scmCreds"]["token"] == conn.token
      assert found["pluralCreds"]["token"]
      assert found["pluralCreds"]["url"]
    end

    test "a cluster receives scm creds from the runtime's bound connection" do
      cluster = insert(:cluster)
      insert(:scm_connection, default: true, token: "default-token")
      runtime_conn = insert(:scm_connection, name: "runtime-github", token: "runtime-token")
      runtime = insert(:agent_runtime, cluster: cluster, connection: runtime_conn)
      run = insert(:agent_run, runtime: runtime)

      {:ok, %{data: %{"agentRun" => found}}} = run_query("""
        query AgentRun($id: ID!) {
          agentRun(id: $id) {
            id
            scmCreds {
              token
            }
          }
        }
      """, %{"id" => run.id}, %{cluster: cluster})

      assert found["scmCreds"]["token"] == "runtime-token"
    end

    test "a cluster cannot fetch a run if its not the runner cluster" do
      cluster = insert(:cluster)
      run = insert(:agent_run)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query AgentRun($id: ID!) {
          agentRun(id: $id) { id }
        }
      """, %{"id" => run.id}, %{cluster: cluster})
    end

    test "it exposes the workbench job when the run is linked to a workbench activity" do
      user = insert(:user)
      workbench = insert(:workbench, name: "infra-debugger")
      job = insert(:workbench_job, workbench: workbench)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :coding)
      run = insert(:agent_run, user: user)

      {:ok, _} = Workbenches.associate_agent_run(activity, run.id)

      {:ok, %{data: %{"agentRun" => found}}} = run_query("""
        query AgentRun($id: ID!) {
          agentRun(id: $id) {
            id
            workbenchJob {
              id
              workbench { id name }
            }
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert found["id"] == run.id
      assert found["workbenchJob"]["id"] == job.id
      assert found["workbenchJob"]["workbench"]["id"] == workbench.id
      assert found["workbenchJob"]["workbench"]["name"] == "infra-debugger"
    end

    test "it returns null workbenchJob when the run is not linked to a workbench activity" do
      user = insert(:user)
      run = insert(:agent_run, user: user)

      {:ok, %{data: %{"agentRun" => found}}} = run_query("""
        query AgentRun($id: ID!) {
          agentRun(id: $id) {
            id
            workbenchJob { id }
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert found["id"] == run.id
      refute found["workbenchJob"]
    end
  end

  describe "agentRuntime" do
    test "a user can fetch a runtime they can create runs on" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      insert(:agent_runtime)

      {:ok, %{data: %{"agentRuntime" => found}}} = run_query("""
        query AgentRuntime($id: ID!) {
          agentRuntime(id: $id) { id }
        }
      """, %{"id" => runtime.id}, %{current_user: Console.Services.Rbac.preload(user)})

      assert found["id"] == runtime.id
    end

    test "a user cannot fetch a runtime they cannot create runs on" do
      user = insert(:user)
      runtime = insert(:agent_runtime)
      insert(:agent_runtime, create_bindings: [%{user_id: user.id}])

      {:ok, %{errors: [_ | _]}} = run_query("""
        query AgentRuntime($id: ID!) {
          agentRuntime(id: $id) { id }
        }
      """, %{"id" => runtime.id}, %{current_user: insert(:user)})
    end

    test "a user can fetch a runtime by name and cluster id" do
      user    = insert(:user)
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster, create_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"agentRuntime" => found}}} = run_query("""
        query AgentRuntime($name: String!, $clusterId: ID!) {
          agentRuntime(name: $name, clusterId: $clusterId) { id }
        }
      """, %{"name" => runtime.name, "clusterId" => cluster.id}, %{current_user: user})

      assert found["id"] == runtime.id
    end

    test "a cluster can fetch their own runtime" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster)
      ignore = insert(:agent_runtime)

      {:ok, %{data: %{"agentRuntime" => found}}} = run_query("""
        query AgentRuntime($id: ID!) {
          agentRuntime(id: $id) { id }
        }
      """, %{"id" => runtime.id}, %{cluster: cluster})

      assert found["id"] == runtime.id

      {:ok, %{errors: [_ | _]}} = run_query("""
        query AgentRuntime($id: ID!) {
          agentRuntime(id: $id) { id }
        }
      """, %{"id" => ignore.id}, %{cluster: cluster})
    end

    test "a cluster sideload pending runs" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster)
      runs = insert_list(3, :agent_run, runtime: runtime, status: :pending)
      insert_list(3, :agent_run, runtime: runtime, status: :running)

      {:ok, %{data: %{"agentRuntime" => found}}} = run_query("""
        query AgentRuntime($id: ID!) {
          agentRuntime(id: $id) {
            pendingRuns(first: 5) { edges { node { id } } }
          }
        }
      """, %{"id" => runtime.id}, %{cluster: cluster})

      assert from_connection(found["pendingRuns"])
             |> ids_equal(runs)
    end
  end

  describe "sharedAgentRun" do
    test "a user can fetch a shared agent run" do
      run = insert(:agent_run, shared: true)

      {:ok, %{data: %{"sharedAgentRun" => found}}} = run_query("""
        query SharedAgentRun($id: ID!) {
          sharedAgentRun(id: $id) {
            id
            shared
          }
        }
      """, %{"id" => run.id}, %{current_user: insert(:user)})

      assert found["id"] == run.id
      assert found["shared"]
    end

    test "a random user cannot fetch a non-shared agent run" do
      user = insert(:user)
      run = insert(:agent_run)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query SharedAgentRun($id: ID!) {
          sharedAgentRun(id: $id) { id }
        }
      """, %{"id" => run.id}, %{current_user: user})
    end
  end

  describe "agentRunRepositories" do
    test "a user can list their repositories" do
      user = insert(:user)
      repos = insert_list(3, :agent_run_repository)

      {:ok, %{data: %{"agentRunRepositories" => found}}} = run_query("""
        query AgentRunRepositories {
          agentRunRepositories(first: 5) { edges { node { id } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(repos)
    end
  end
end
