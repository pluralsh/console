defmodule Console.GraphQl.Deployments.DevboxQueriesTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Devboxes.Control

  describe "devboxes" do
    test "admins can list devboxes, filtered by workbench" do
      devboxes = insert_list(3, :devbox)
      wb = insert(:workbench)
      insert(:workbench_devbox, workbench: wb, devbox: hd(devboxes))

      {:ok, %{data: %{"devboxes" => found}}} = run_query("""
        query { devboxes(first: 5) { edges { node { id name agents { type models { id } defaultModel } } } } }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found) |> ids_equal(devboxes)

      {:ok, %{data: %{"devboxes" => found}}} = run_query("""
        query Devboxes($wid: ID) { devboxes(first: 5, workbenchId: $wid) { edges { node { id } } } }
      """, %{"wid" => wb.id}, %{current_user: admin_user()})

      assert from_connection(found) |> ids_equal([hd(devboxes)])
    end
  end

  describe "devboxAgents" do
    test "it lists the catalog of an attached box with offered models" do
      user = insert(:user)
      wb = insert(:workbench, read_bindings: [%{user_id: user.id}])
      devbox = insert(:devbox)
      insert(:workbench_devbox, workbench: wb, devbox: devbox)

      {:ok, %{data: %{"devboxAgents" => [agent]}}} = run_query("""
        query Agents($wid: ID!, $id: ID!) {
          devboxAgents(workbenchId: $wid, devboxId: $id) {
            type
            default
            models { id }
            defaultModel
            sessionCapabilities { fork resume }
          }
        }
      """, %{"wid" => wb.id, "id" => devbox.id}, %{current_user: user})

      assert agent["type"] == "CLAUDE"
      assert Enum.map(agent["models"], & &1["id"]) == ["sonnet", "opus"]
      assert agent["defaultModel"] == "sonnet"
      assert agent["sessionCapabilities"]["fork"]
    end
  end

  describe "devboxInstance" do
    test "workbench readers can read an instance with its threads and pending interactions" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))
      thread = insert(:devbox_instance_session, instance: inst, title: "agent", user_title: "mine")
      insert(:devbox_instance_session, instance: inst, status: :deleted)
      interaction = insert(:devbox_instance_interaction, instance: inst, session: thread)
      insert(:devbox_instance_interaction, instance: inst, state: :answered)

      {:ok, %{data: %{"devboxInstance" => found}}} = run_query("""
        query Instance($id: ID!) {
          devboxInstance(id: $id) {
            id
            status
            devbox { id }
            workbench { id }
            threads { id title agentTitle status }
            interactions(pending: true) { id kind state options { optionId } }
          }
        }
      """, %{"id" => inst.id}, %{current_user: user})

      assert found["id"] == inst.id
      assert found["status"] == "RUNNING"
      assert found["devbox"]["id"] == inst.devbox_id
      assert [%{"id" => tid, "title" => "mine", "agentTitle" => "agent"}] = found["threads"]
      assert tid == thread.id
      assert [%{"id" => iid, "kind" => "PERMISSION", "options" => [%{"optionId" => "allow"}]}] = found["interactions"]
      assert iid == interaction.id
    end

    test "it maps the workbench MCP's tool names to their integrations" do
      user = insert(:user)
      bench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      github = insert(:workbench_tool, tool: :github, name: "gh", categories: [:scm],
        configuration: %{github: %{access_token: "token"}})
      slack = insert(:workbench_tool, tool: :slack, name: "chat", categories: [:chat],
        configuration: %{slack: %{bot_token: "xoxb-test"}})
      insert(:workbench_tool_association, workbench: bench, tool: github)
      insert(:workbench_tool_association, workbench: bench, tool: slack)
      inst = insert(:devbox_instance, workbench: bench)

      {:ok, %{data: %{"devboxInstance" => %{"mcpTools" => tools}}}} = run_query("""
        query Instance($id: ID!) {
          devboxInstance(id: $id) { mcpTools { name toolType provider workbenchToolId workbenchToolName } }
        }
      """, %{"id" => inst.id}, %{current_user: user})

      by_name = Map.new(tools, &{&1["name"], &1})
      assert %{"toolType" => "GITHUB", "workbenchToolId" => gid, "workbenchToolName" => "gh", "provider" => nil} =
        by_name["github_gh_close_pull_request"]
      assert gid == github.id
      assert Enum.any?(tools, &(&1["toolType"] == "SLACK" && &1["workbenchToolId"] == slack.id))
      assert Enum.all?(tools, &(&1["toolType"] in ["GITHUB", "SLACK"]))
    end

    test "it lists subagents with the threads that spawned them" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))
      thread = insert(:devbox_instance_session, instance: inst)
      sub = insert(:devbox_instance_session, instance: inst, kind: :subagent, parent: thread, parent_tool_call_id: "toolu_1")

      {:ok, %{data: %{"devboxInstance" => %{"threads" => threads}}}} = run_query("""
        query Instance($id: ID!) {
          devboxInstance(id: $id) { threads { id kind parent { id } parentToolCallId } }
        }
      """, %{"id" => inst.id}, %{current_user: user})

      by_id = Map.new(threads, &{&1["id"], &1})
      assert by_id[thread.id]["kind"] == "THREAD"
      assert by_id[sub.id]["kind"] == "SUBAGENT"
      assert by_id[sub.id]["parent"]["id"] == thread.id
      assert by_id[sub.id]["parentToolCallId"] == "toolu_1"
    end

    test "it stages threads and filters them by stage" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))
      running = insert(:devbox_instance_session, instance: inst, foreground_state: :running)
      queued = insert(:devbox_instance_session, instance: inst, status: :waiting)
      asking = insert(:devbox_instance_session, instance: inst, foreground_state: :requires_action)
      finished = insert(:devbox_instance_session, instance: inst, stop_reason: "end_turn")
      closed = insert(:devbox_instance_session, instance: inst, status: :closed)

      query = """
        query Instance($id: ID!, $stages: [DevboxThreadStage]) {
          devboxInstance(id: $id) { threads(stages: $stages) { id stage } }
        }
      """

      {:ok, %{data: %{"devboxInstance" => %{"threads" => threads}}}} =
        run_query(query, %{"id" => inst.id}, %{current_user: user})

      assert Map.new(threads, &{&1["id"], &1["stage"]}) == %{
        running.id => "RUNNING",
        queued.id => "RUNNING",
        asking.id => "NEEDS_REVIEW",
        finished.id => "COMPLETED",
        closed.id => "COMPLETED"
      }

      for {stage, expected} <- [{"RUNNING", [running, queued]}, {"NEEDS_REVIEW", [asking]}, {"COMPLETED", [finished, closed]}] do
        {:ok, %{data: %{"devboxInstance" => %{"threads" => threads}}}} =
          run_query(query, %{"id" => inst.id, "stages" => [stage]}, %{current_user: user})

        assert ids_equal(threads, expected)
      end
    end

    test "users without workbench access cannot read instances" do
      inst = insert(:devbox_instance)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Instance($id: ID!) { devboxInstance(id: $id) { id } }
      """, %{"id" => inst.id}, %{current_user: insert(:user)})
    end
  end

  describe "workbench devbox fields" do
    test "it lists a workbench's devboxes, instances, snapshots and inbox" do
      user = insert(:user)
      wb = insert(:workbench, read_bindings: [%{user_id: user.id}])
      devbox = insert(:devbox)
      insert(:workbench_devbox, workbench: wb, devbox: devbox)
      mine = insert(:devbox_instance, workbench: wb, devbox: devbox, user: user)
      insert(:devbox_instance, workbench: wb, devbox: devbox, status: :suspended)
      snapshot = insert(:devbox_snapshot, workbench: wb, devbox: devbox)
      pending = insert(:devbox_instance_interaction, instance: mine)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            devboxes { id }
            devboxInstances(first: 5, statuses: [RUNNING]) { edges { node { id } } }
            mine: devboxInstances(first: 5, mine: true) { edges { node { id } } }
            devboxSnapshots(first: 5) { edges { node { id } } }
            devboxInbox { id }
          }
        }
      """, %{"id" => wb.id}, %{current_user: user})

      assert [%{"id" => did}] = found["devboxes"]
      assert did == devbox.id
      assert from_connection(found["devboxInstances"]) |> ids_equal([mine])
      assert from_connection(found["mine"]) |> ids_equal([mine])
      assert from_connection(found["devboxSnapshots"]) |> ids_equal([snapshot])
      assert [%{"id" => pid}] = found["devboxInbox"]
      assert pid == pending.id
    end

    test "it hides ended instances unless asked for them" do
      user = insert(:user)
      wb = insert(:workbench, read_bindings: [%{user_id: user.id}])
      running = insert(:devbox_instance, workbench: wb)
      suspended = insert(:devbox_instance, workbench: wb, status: :suspended)
      cancelled = insert(:devbox_instance, workbench: wb, status: :cancelled)
      failed = insert(:devbox_instance, workbench: wb, status: :failed)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Workbench($id: ID!) {
          workbench(id: $id) {
            live: devboxInstances(first: 10) { edges { node { id } } }
            all: devboxInstances(first: 10, includeEnded: true) { edges { node { id } } }
            cancelled: devboxInstances(first: 10, statuses: [CANCELLED]) { edges { node { id } } }
          }
        }
      """, %{"id" => wb.id}, %{current_user: user})

      assert from_connection(found["live"]) |> ids_equal([running, suspended])
      assert from_connection(found["all"]) |> ids_equal([running, suspended, cancelled, failed])
      assert from_connection(found["cancelled"]) |> ids_equal([cancelled])
    end
  end

  describe "devboxTimeline" do
    test "it returns typed ACP entities" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))

      expect(Control.Test, :get_timeline, fn _, "sess-1", %{limit: 10} ->
        {:ok, %{
          delta_offset: 42,
          seq: 7,
          stream: "run-1",
          has_more: true,
          entities: [
            %{
              key: %{session_id: "sess-1", id: "m1", type: :ENTITY_TYPE_AGENT_MESSAGE},
              position: 1,
              settled: true,
              acp_json: Jason.encode!(%{"messageId" => "m1", "content" => [%{"type" => "text", "text" => "hello"}]})
            },
            %{
              key: %{session_id: "sess-1", id: "t1", type: :ENTITY_TYPE_TOOL_CALL},
              position: 2,
              acp_json: Jason.encode!(%{
                "toolCallId" => "t1",
                "title" => "edit file",
                "kind" => "edit",
                "status" => "completed",
                "content" => [%{"type" => "diff", "path" => "a.ex", "oldText" => "a", "newText" => "b"}],
                "locations" => [%{"path" => "a.ex", "line" => 3}]
              })
            },
            %{
              key: %{session_id: "sess-1", id: "x1", type: :ENTITY_TYPE_TERMINAL},
              position: 3,
              acp_json: Jason.encode!(%{"terminalId" => "x1", "command" => "mix", "exitStatus" => %{"exitCode" => 0}})
            }
          ]
        }}
      end)

      {:ok, %{data: %{"devboxTimeline" => timeline}}} = run_query("""
        query Timeline($id: ID!) {
          devboxTimeline(instanceId: $id, sessionId: "sess-1", limit: 10) {
            deltaOffset
            seq
            stream
            hasMore
            entities {
              id
              type
              position
              settled
              message { messageId content { ... on DevboxTextContent { text } } }
              toolCall {
                toolCallId
                kind
                content { ... on DevboxToolCallDiff { path oldText newText } }
                locations { path line }
              }
              terminal { command exitCode }
            }
          }
        }
      """, %{"id" => inst.id}, %{current_user: user})

      assert timeline["deltaOffset"] == "42"
      assert timeline["seq"] == "7"
      assert timeline["stream"] == "run-1"
      assert timeline["hasMore"]
      [msg, tool, term] = timeline["entities"]
      assert msg["type"] == "AGENT_MESSAGE"
      assert msg["message"]["content"] == [%{"text" => "hello"}]
      assert tool["type"] == "TOOL_CALL"
      assert tool["toolCall"]["content"] == [%{"path" => "a.ex", "oldText" => "a", "newText" => "b"}]
      assert tool["toolCall"]["locations"] == [%{"path" => "a.ex", "line" => 3}]
      assert term["terminal"] == %{"command" => "mix", "exitCode" => 0}
    end

    test "it pages backwards from a position given as a number or a string" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))
      expect(Control.Test, :get_timeline, 2, fn _, "s", %{before: 12} ->
        {:ok, %{delta_offset: 0, seq: 0, stream: "", has_more: false, entities: []}}
      end)

      for before <- [12, "12"] do
        {:ok, %{data: %{"devboxTimeline" => %{"hasMore" => false}}}} = run_query("""
          query Timeline($id: ID!, $before: Long) {
            devboxTimeline(instanceId: $id, sessionId: "s", before: $before) { hasMore }
          }
        """, %{"id" => inst.id, "before" => before}, %{current_user: user})
      end
    end

    test "it returns a typed error when the cluster is offline" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))
      expect(Control.Test, :get_timeline, fn _, _, _ -> {:error, :not_connected} end)

      {:ok, %{errors: [error]}} = run_query("""
        query Timeline($id: ID!) { devboxTimeline(instanceId: $id, sessionId: "s") { hasMore } }
      """, %{"id" => inst.id}, %{current_user: user})

      assert error.extensions.code == "CLUSTER_OFFLINE"
    end
  end

  describe "devboxInstanceCommands" do
    test "it lists a thread's commands" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))
      thread = insert(:devbox_instance_session, instance: inst)
      expect(Control.Test, :list_commands, fn _, _ -> {:ok, [%{name: "review", description: "review a pr", input_hint: "pr"}]} end)

      {:ok, %{data: %{"devboxInstanceCommands" => [cmd]}}} = run_query("""
        query Commands($id: ID!) { devboxInstanceCommands(threadId: $id) { name description inputHint } }
      """, %{"id" => thread.id}, %{current_user: user})

      assert cmd["name"] == "review"
      assert cmd["inputHint"] == "pr"
    end
  end

  describe "devbox" do
    test "a cluster can fetch its devbox by name" do
      devbox = insert(:devbox)

      {:ok, %{data: %{"devbox" => found}}} = run_query("""
        query Devbox($name: String) { devbox(name: $name) { id name } }
      """, %{"name" => devbox.name}, %{cluster: devbox.cluster})

      assert found["id"] == devbox.id
    end
  end

  describe "pullRequests" do
    test "it filters by devbox attribution" do
      inst = insert(:devbox_instance)
      thread = insert(:devbox_instance_session, instance: inst)
      pr = insert(:pull_request, devbox: inst.devbox, devbox_instance: inst, devbox_instance_session: thread, source: :mcp)
      insert(:pull_request)

      {:ok, %{data: %{"pullRequests" => found}}} = run_query("""
        query PRs($tid: ID) {
          pullRequests(first: 5, devboxThreadId: $tid) {
            edges { node { id source devbox { id } devboxInstance { id } devboxThread { id } } }
          }
        }
      """, %{"tid" => thread.id}, %{current_user: admin_user()})

      [node] = from_connection(found)
      assert node["id"] == pr.id
      assert node["source"] == "MCP"
      assert node["devboxThread"]["id"] == thread.id
      assert node["devboxInstance"]["id"] == inst.id
    end
  end
end
