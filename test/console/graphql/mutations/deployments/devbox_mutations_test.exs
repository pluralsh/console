defmodule Console.GraphQl.Deployments.DevboxMutationsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Devboxes.Control

  describe "upsertDevbox" do
    test "a cluster can upsert its devbox with the probed catalog" do
      cluster = insert(:cluster, allow_agents: true)

      {:ok, %{data: %{"upsertDevbox" => devbox}}} = run_query("""
        mutation Upsert($attrs: DevboxAttributes!) {
          upsertDevbox(attributes: $attrs) {
            id
            name
            status
            agents { type default models { id } configOptions { configId options { value } } sessionCapabilities { fork } }
            cluster { id }
          }
        }
      """, %{"attrs" => %{
        "name" => "dev",
        "image" => "ghcr.io/pluralsh/devbox:1",
        "status" => "READY",
        "agents" => [%{
          "type" => "CLAUDE",
          "default" => true,
          "models" => [%{"id" => "sonnet"}],
          "configOptions" => [%{"configId" => "mode", "name" => "Mode", "options" => [%{"value" => "plan"}]}],
          "sessionCapabilities" => %{"fork" => true}
        }]
      }}, %{cluster: cluster})

      assert devbox["name"] == "dev"
      assert devbox["status"] == "READY"
      assert devbox["cluster"]["id"] == cluster.id
      [agent] = devbox["agents"]
      assert agent["type"] == "CLAUDE"
      assert agent["models"] == [%{"id" => "sonnet"}]
      assert agent["configOptions"] == [%{"configId" => "mode", "options" => [%{"value" => "plan"}]}]
      assert agent["sessionCapabilities"]["fork"]
    end
  end

  describe "heartbeatDevbox" do
    test "a cluster can heartbeat its devbox" do
      devbox = insert(:devbox)

      {:ok, %{data: %{"heartbeatDevbox" => beat}}} = run_query("""
        mutation Beat($id: ID!, $attrs: DevboxHeartbeatAttributes!) {
          heartbeatDevbox(id: $id, attributes: $attrs) { id status lastHeartbeatAt conditions { type status } }
        }
      """, %{"id" => devbox.id, "attrs" => %{"status" => "DEGRADED", "conditions" => [%{"type" => "Ready", "status" => "False"}]}}, %{cluster: devbox.cluster})

      assert beat["status"] == "DEGRADED"
      assert beat["lastHeartbeatAt"]
      assert beat["conditions"] == [%{"type" => "Ready", "status" => "False"}]
    end
  end

  describe "deleteDevbox" do
    test "a cluster can delete its devbox" do
      devbox = insert(:devbox)

      {:ok, %{data: %{"deleteDevbox" => %{"id" => id}}}} = run_query("""
        mutation Delete($id: ID!) { deleteDevbox(id: $id) { id } }
      """, %{"id" => devbox.id}, %{cluster: devbox.cluster})

      assert id == devbox.id
      refute refetch(devbox)
    end
  end

  describe "mintDevboxProbeToken" do
    test "a cluster can mint a probe token" do
      devbox = insert(:devbox)

      {:ok, %{data: %{"mintDevboxProbeToken" => %{"token" => token, "expiresAt" => exp}}}} = run_query("""
        mutation Mint($id: ID!) { mintDevboxProbeToken(id: $id) { token expiresAt } }
      """, %{"id" => devbox.id}, %{cluster: devbox.cluster})

      assert Console.Devboxes.Credentials.devbox_token?(token)
      assert exp
    end
  end

  describe "attachDevbox" do
    test "workbench writers can attach and detach devboxes" do
      user = insert(:user)
      wb = insert(:workbench, write_bindings: [%{user_id: user.id}])
      devbox = insert(:devbox, create_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"attachDevbox" => %{"id" => id}}}} = run_query("""
        mutation Attach($wid: ID!, $id: ID!) { attachDevbox(workbenchId: $wid, devboxId: $id) { id } }
      """, %{"wid" => wb.id, "id" => devbox.id}, %{current_user: user})
      assert id == devbox.id

      {:ok, %{data: %{"detachDevbox" => %{"id" => ^id}}}} = run_query("""
        mutation Detach($wid: ID!, $id: ID!) { detachDevbox(workbenchId: $wid, devboxId: $id) { id } }
      """, %{"wid" => wb.id, "id" => devbox.id}, %{current_user: user})
    end
  end

  describe "createDevboxInstance" do
    test "workbench readers can start an instance" do
      user = insert(:user)
      wb = insert(:workbench, read_bindings: [%{user_id: user.id}])
      devbox = insert(:devbox, create_bindings: [%{user_id: user.id}])
      insert(:workbench_devbox, workbench: wb, devbox: devbox)

      {:ok, %{data: %{"createDevboxInstance" => inst}}} = run_query("""
        mutation Create($wid: ID!, $attrs: DevboxInstanceAttributes!) {
          createDevboxInstance(workbenchId: $wid, attributes: $attrs) { id status agent requestedModel user { id } }
        }
      """, %{"wid" => wb.id, "attrs" => %{"devboxId" => devbox.id, "model" => "opus"}}, %{current_user: user})

      assert inst["status"] == "PENDING"
      assert inst["agent"] == "CLAUDE"
      assert inst["requestedModel"] == "opus"
      assert inst["user"]["id"] == user.id
    end

    test "it surfaces offline clusters as a typed error" do
      user = insert(:user)
      wb = insert(:workbench, read_bindings: [%{user_id: user.id}])
      devbox = insert(:devbox, create_bindings: [%{user_id: user.id}])
      insert(:workbench_devbox, workbench: wb, devbox: devbox)
      expect(Control.Test, :create_instance, fn _, _ -> {:error, :not_connected} end)

      {:ok, %{errors: [error]}} = run_query("""
        mutation Create($wid: ID!, $attrs: DevboxInstanceAttributes!) {
          createDevboxInstance(workbenchId: $wid, attributes: $attrs) { id }
        }
      """, %{"wid" => wb.id, "attrs" => %{"devboxId" => devbox.id}}, %{current_user: user})

      assert error.extensions.code == "CLUSTER_OFFLINE"
    end
  end

  describe "cancelDevboxInstance" do
    test "the owner can cancel an instance" do
      inst = owned_instance()

      {:ok, %{data: %{"cancelDevboxInstance" => %{"status" => "CANCELLED"}}}} = run_query("""
        mutation Cancel($id: ID!) { cancelDevboxInstance(id: $id) { status } }
      """, %{"id" => inst.id}, %{current_user: inst.user})
    end
  end

  describe "keepDevboxInstanceAwake" do
    test "it records a deferral lease" do
      inst = owned_instance()
      until = Timex.now() |> Timex.shift(hours: 1) |> DateTime.to_iso8601()

      {:ok, %{data: %{"keepDevboxInstanceAwake" => kept}}} = run_query("""
        mutation Keep($id: ID!, $until: DateTime!) {
          keepDevboxInstanceAwake(id: $id, until: $until) { keepAwakeUntil keepAwakeBy { id } leases { kind expiresAt holder { id } } }
        }
      """, %{"id" => inst.id, "until" => until}, %{current_user: inst.user})

      assert kept["keepAwakeUntil"]
      assert kept["keepAwakeBy"]["id"] == inst.user_id
      assert [%{"kind" => "DEFERRAL", "holder" => %{"id" => uid}}] = kept["leases"]
      assert uid == inst.user_id
    end
  end

  describe "createDevboxPullRequest" do
    test "it starts preparing a pull request for a checkout" do
      inst = owned_instance()
      expect(Console.Devboxes.PullRequests, :spawn_job, fn _ -> {:ok, self()} end)

      {:ok, %{data: %{"createDevboxPullRequest" => job}}} = run_query("""
        mutation Create($id: ID!) {
          createDevboxPullRequest(instanceId: $id, repository: "console") { id instanceId repository status }
        }
      """, %{"id" => inst.id}, %{current_user: inst.user})

      assert job["id"]
      assert job["instanceId"] == inst.id
      assert job["repository"] == "console"
      assert job["status"] == "RUNNING"
    end
  end

  describe "pingDevboxInstance" do
    test "it registers a viewer" do
      inst = owned_instance()

      {:ok, %{data: %{"pingDevboxInstance" => %{"viewerCount" => 1}}}} = run_query("""
        mutation Ping($id: ID!) { pingDevboxInstance(id: $id) { viewerCount } }
      """, %{"id" => inst.id}, %{current_user: inst.user})
    end
  end

  describe "createDevboxSnapshot" do
    test "it creates a pending snapshot" do
      inst = owned_instance()

      {:ok, %{data: %{"createDevboxSnapshot" => snap}}} = run_query("""
        mutation Snap($id: ID!) { createDevboxSnapshot(instanceId: $id, attributes: {name: "snap"}) { id name status } }
      """, %{"id" => inst.id}, %{current_user: inst.user})

      assert snap["name"] == "snap"
      assert snap["status"] == "PENDING"
    end
  end

  describe "createDevboxThread" do
    test "it creates a thread with an initial prompt" do
      inst = owned_instance()
      expect(Control.Test, :create_thread, fn _, _, %{prompt: [%{"type" => "text", "text" => "fix the bug"}]} ->
        {:ok, %{session_id: "sess-new"}}
      end)

      {:ok, %{data: %{"createDevboxThread" => thread}}} = run_query("""
        mutation Thread($id: ID!) {
          createDevboxThread(instanceId: $id, attributes: {title: "bug", prompt: "fix the bug"}) {
            id sessionId title status kind agent cwd
          }
        }
      """, %{"id" => inst.id}, %{current_user: inst.user})

      assert thread["sessionId"] == "sess-new"
      assert thread["title"] == "bug"
      assert thread["status"] == "ACTIVE"
      assert thread["kind"] == "THREAD"
      assert thread["cwd"] == "~"
    end
  end

  describe "promptDevboxThread" do
    test "it sends content blocks" do
      inst = owned_instance()
      thread = insert(:devbox_instance_session, instance: inst, user: inst.user)
      expect(Control.Test, :send_prompt, fn _, _, [%{"type" => "text", "text" => "a"}, %{"type" => "resource_link", "uri" => "file:///x"}], [] -> :ok end)

      {:ok, %{data: %{"promptDevboxThread" => %{"id" => id}}}} = run_query("""
        mutation Prompt($id: ID!, $content: [DevboxPromptBlockAttributes]) {
          promptDevboxThread(id: $id, content: $content) { id }
        }
      """, %{"id" => thread.id, "content" => [
        %{"type" => "TEXT", "text" => "a"},
        %{"type" => "RESOURCE_LINK", "uri" => "file:///x"}
      ]}, %{current_user: inst.user})

      assert id == thread.id
    end

    @tag :tmp_dir
    test "it forwards uploaded attachments", %{tmp_dir: dir} do
      inst = owned_instance()
      thread = insert(:devbox_instance_session, instance: inst, user: inst.user)
      path = Path.join(dir, "screen.png")
      File.write!(path, "png-bytes")
      upload = %Plug.Upload{path: path, filename: "screen.png", content_type: "image/png"}
      expect(Control.Test, :send_prompt, fn _, _, [%{"type" => "text", "text" => "see"}], [att] ->
        assert att == %{name: "screen.png", mime_type: "image/png", data: "png-bytes"}
        :ok
      end)

      {:ok, %{data: %{"promptDevboxThread" => %{"id" => id}}}} = run_query("""
        mutation Prompt($id: ID!, $prompt: String, $attachments: [Upload]) {
          promptDevboxThread(id: $id, prompt: $prompt, attachments: $attachments) { id }
        }
      """, %{"id" => thread.id, "prompt" => "see", "attachments" => ["shot"]},
        %{current_user: inst.user, __absinthe_plug__: %{uploads: %{"shot" => upload}}})

      assert id == thread.id
    end
  end

  describe "forkDevboxThread" do
    test "unsupported operations return a typed error" do
      inst = owned_instance(devbox_attrs: [agents: [%Console.Schema.Devbox.Agent{type: :claude, default: true}]])
      thread = insert(:devbox_instance_session, instance: inst, user: inst.user)

      {:ok, %{errors: [error]}} = run_query("""
        mutation Fork($id: ID!) { forkDevboxThread(id: $id) { id } }
      """, %{"id" => thread.id}, %{current_user: inst.user})

      assert error.extensions.code == "UNSUPPORTED"
    end
  end

  describe "respondDevboxInteraction" do
    test "it answers a permission request" do
      inst = owned_instance()
      interaction = insert(:devbox_instance_interaction, instance: inst)

      {:ok, %{data: %{"respondDevboxInteraction" => resp}}} = run_query("""
        mutation Respond($id: ID!) {
          respondDevboxInteraction(id: $id, response: {optionId: "allow"}) { id state answeredBy { id } }
        }
      """, %{"id" => interaction.id}, %{current_user: inst.user})

      assert resp["state"] == "ANSWERED"
      assert resp["answeredBy"]["id"] == inst.user_id
    end
  end

  describe "renameDevboxThread" do
    test "it renames a thread" do
      inst = owned_instance()
      thread = insert(:devbox_instance_session, instance: inst, user: inst.user, title: "agent")

      {:ok, %{data: %{"renameDevboxThread" => %{"title" => "mine", "agentTitle" => "agent"}}}} = run_query("""
        mutation Rename($id: ID!) { renameDevboxThread(id: $id, title: "mine") { title agentTitle } }
      """, %{"id" => thread.id}, %{current_user: inst.user})
    end
  end

  defp owned_instance(attrs \\ []) do
    user = insert(:user)
    {devbox_attrs, attrs} = Keyword.pop(attrs, :devbox_attrs, [])
    wb = insert(:workbench, read_bindings: [%{user_id: user.id}])
    insert(:devbox_instance, Keyword.merge(attrs, user: user, workbench: wb, devbox: insert(:devbox, devbox_attrs)))
  end
end
