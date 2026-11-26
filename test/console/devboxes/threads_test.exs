defmodule Console.Devboxes.ThreadsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Devboxes.{Control, Threads}
  alias Console.Schema.{DevboxInstanceSession, Devbox}

  describe "#create_thread/3" do
    test "it creates a thread and binds the agent's session id" do
      inst = owned_instance()
      expect(Control.Test, :create_thread, fn %{id: id}, %DevboxInstanceSession{}, %{model: "opus", prompt: [%{"type" => "text", "text" => "hi"}], principal: %{user_id: uid}} ->
        assert id == inst.id
        assert uid == inst.user_id
        {:ok, %{session_id: "sess-abc"}}
      end)

      {:ok, thread} = Threads.create_thread(%{model: "opus", prompt: "hi", title: "my thread"}, inst.id, inst.user)

      assert thread.acp_session_id == "sess-abc"
      assert thread.status == :active
      assert thread.agent == :claude
      assert thread.cwd == "~"
      assert thread.user_id == inst.user_id
      assert DevboxInstanceSession.display_title(thread) == "my thread"
      assert_receive {:event, %Console.PubSub.DevboxThreadUpdated{item: %{id: id}}}
      assert id == thread.id
    end

    test "a thread waits for its session id if the agent hasn't returned one" do
      inst = owned_instance()
      expect(Control.Test, :create_thread, fn _, _, _ -> {:ok, %{}} end)

      {:ok, %{status: :waiting}} = Threads.create_thread(%{}, inst.id, inst.user)
    end

    test "it validates the model and working directory" do
      inst = owned_instance()

      {:error, _} = Threads.create_thread(%{model: "haiku"}, inst.id, inst.user)
      {:error, _} = Threads.create_thread(%{cwd: "/etc"}, inst.id, inst.user)
    end

    test "it fails on ended instances" do
      inst = owned_instance(status: :cancelled)

      {:error, _} = Threads.create_thread(%{}, inst.id, inst.user)
    end

    test "it is gated on the workbench budget for proxy billed agents" do
      inst = owned_instance(workbench_attrs: [budget: %Console.Schema.Workbench.Budget{
        enabled: true,
        maximum: 100,
        min_free: 10,
        unit: :token,
        last: 0,
        last_updated: DateTime.utc_now()
      }])

      {:error, msg} = Threads.create_thread(%{}, inst.id, inst.user)
      assert msg =~ "budget"
    end

    test "it returns a typed error if the cluster is offline" do
      inst = owned_instance()
      expect(Control.Test, :create_thread, fn _, _, _ -> {:error, :not_connected} end)

      {:error, %{extensions: %{code: "CLUSTER_OFFLINE"}}} = Threads.create_thread(%{}, inst.id, inst.user)

      [%{status: :deleted}] = Console.Repo.all(DevboxInstanceSession.for_instance(inst.id))
    end
  end

  describe "thread lifecycle" do
    test "threads can be closed, resumed, renamed and deleted" do
      thread = owned_thread()

      {:ok, closed} = Threads.close_thread(thread.id, thread.user)
      assert closed.status == :closed

      {:ok, resumed} = Threads.resume_thread(thread.id, thread.user)
      assert resumed.status == :active

      {:ok, renamed} = Threads.rename_thread(thread.id, "renamed", thread.user)
      assert renamed.user_title == "renamed"

      {:ok, deleted} = Threads.delete_thread(thread.id, thread.user)
      assert deleted.status == :deleted
    end

    test "unsupported lifecycle operations return a typed error" do
      thread = owned_thread(devbox_attrs: [agents: [%Devbox.Agent{type: :claude, default: true}]])

      {:error, %{extensions: %{code: "UNSUPPORTED"}}} = Threads.close_thread(thread.id, thread.user)
      {:error, %{extensions: %{code: "UNSUPPORTED"}}} = Threads.fork_thread(thread.id, %{}, thread.user)
    end

    test "deleting still works for agents without session/delete" do
      thread = owned_thread()
      expect(Control.Test, :delete_thread, fn _, _ -> {:error, :unsupported} end)

      {:ok, %{status: :deleted}} = Threads.delete_thread(thread.id, thread.user)
    end

    test "only the creator or workbench writers can delete a thread" do
      inst = owned_instance()
      thread = insert(:devbox_instance_session, instance: inst, user: insert(:user))

      {:error, _} = Threads.delete_thread(thread.id, inst.user)
      {:ok, _} = Threads.close_thread(thread.id, inst.user)
    end

    test "threads can be forked" do
      thread = owned_thread(acp_session_id: "sess-src")
      expect(Control.Test, :fork_thread, fn _, %{acp_session_id: "sess-src"}, %DevboxInstanceSession{} ->
        {:ok, %{session_id: "sess-fork"}}
      end)

      {:ok, fork} = Threads.fork_thread(thread.id, %{}, thread.user)

      assert fork.acp_session_id == "sess-fork"
      assert fork.id != thread.id
      assert fork.user_title =~ "Fork of"
    end
  end

  describe "#send_prompt/4" do
    test "it sends ACP content blocks" do
      thread = owned_thread()
      expect(Control.Test, :send_prompt, fn _, %{id: id}, [%{"type" => "text", "text" => "do it"}], [] ->
        assert id == thread.id
        :ok
      end)

      {:ok, _} = Threads.send_prompt(thread.id, "do it", thread.user)
    end

    @tag :tmp_dir
    test "it sends attachments, and a prompt can be attachments alone", %{tmp_dir: dir} do
      thread = owned_thread()
      path = Path.join(dir, "notes.md")
      File.write!(path, "# notes")
      expect(Control.Test, :send_prompt, fn _, _, [], [%{name: "notes.md", mime_type: "text/markdown", data: "# notes"}] -> :ok end)

      {:ok, _} = Threads.send_prompt(thread.id, "", thread.user, [%Plug.Upload{path: path, filename: "notes.md"}])
    end

    @tag :tmp_dir
    test "it enforces attachment limits", %{tmp_dir: dir} do
      thread = owned_thread()
      path = Path.join(dir, "f.txt")
      File.write!(path, "x")
      upload = %Plug.Upload{path: path, filename: "f.txt"}
      big = Path.join(dir, "big.bin")
      File.write!(big, :binary.copy("x", 24 * 1024 * 1024 + 1))

      {:error, "a prompt can have at most 10" <> _} = Threads.send_prompt(thread.id, "hi", thread.user, List.duplicate(upload, 11))
      {:error, "attachments can total at most 24 MB" <> _} = Threads.send_prompt(thread.id, "hi", thread.user, [%Plug.Upload{path: big, filename: "big.bin"}])
      {:error, "a prompt needs text or an attachment"} = Threads.send_prompt(thread.id, "", thread.user)
    end

    test "closed threads can't be prompted" do
      thread = owned_thread(status: :closed)

      {:error, _} = Threads.send_prompt(thread.id, "do it", thread.user)
    end
  end

  describe "#update_queued_prompt/5" do
    test "it stores the queue the box reports back" do
      thread = owned_thread()
      expect(Control.Test, :update_queued_prompt, fn _, %{id: id}, "p2", :edit, "rewritten" ->
        assert id == thread.id
        {:ok, %{updated: true, queued_prompts: [%{prompt_id: "p2", content: [%{text: %{text: "rewritten"}}]}]}}
      end)

      {:ok, updated} = Threads.update_queued_prompt(thread.id, "p2", :edit, "rewritten", thread.user)
      assert [%{prompt_id: "p2", text: "rewritten"}] = updated.queued_prompts
    end

    test "an edit needs text" do
      thread = owned_thread()

      {:error, "a queued prompt needs text"} = Threads.update_queued_prompt(thread.id, "p2", :edit, "  ", thread.user)
    end

    test "only those who can prompt the thread can change its queue" do
      thread = owned_thread()

      {:error, _} = Threads.update_queued_prompt(thread.id, "p2", :cancel, nil, insert(:user))
    end
  end

  describe "#set_config_option/4" do
    test "it validates against the thread's reported options" do
      thread = owned_thread(config_options: [
        %DevboxInstanceSession.ConfigOption{config_id: "mode", options: [%DevboxInstanceSession.ConfigOption.Value{value: "plan"}]}
      ])

      {:ok, _} = Threads.set_config_option(thread.id, "mode", "plan", thread.user)
      {:error, _} = Threads.set_config_option(thread.id, "mode", "yolo", thread.user)
      {:error, _} = Threads.set_config_option(thread.id, "other", "x", thread.user)
    end

    test "autonomy is capped by the devbox's max" do
      levels = Enum.map(~w(manual auto full), &%DevboxInstanceSession.ConfigOption.Value{value: &1})
      thread = owned_thread(
        agent: :claude,
        config_options: [%DevboxInstanceSession.ConfigOption{config_id: "autonomy", options: levels}],
        devbox_attrs: [autonomy: %Devbox.AutonomyPolicy{max: :auto}],
        instance_attrs: [agent_billing: %{"claude" => "subscription"}]
      )

      {:ok, _} = Threads.set_config_option(thread.id, "autonomy", "manual", thread.user)
      {:ok, _} = Threads.set_config_option(thread.id, "autonomy", "auto", thread.user)
      {:error, msg} = Threads.set_config_option(thread.id, "autonomy", "full", thread.user)
      assert msg =~ "above this devbox's max of auto"
    end

    test "a proxy-billed model option accepts the AI proxy's models" do
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key", model: "gpt-5"}})
      thread = owned_thread(
        agent: :claude,
        config_options: [
          %DevboxInstanceSession.ConfigOption{
            config_id: "model",
            category: "model",
            options: [%DevboxInstanceSession.ConfigOption.Value{value: "default"}]
          }
        ],
        devbox_attrs: [agents: [%Devbox.Agent{type: :claude}]]
      )

      {:ok, _} = Threads.set_config_option(thread.id, "model", "openai/gpt-5", thread.user)
      {:ok, _} = Threads.set_config_option(thread.id, "model", "default", thread.user)
      {:error, _} = Threads.set_config_option(thread.id, "model", "anthropic/claude-opus-4-1", thread.user)
    end

    test "auto needs subscription billing" do
      levels = Enum.map(~w(manual auto full), &%DevboxInstanceSession.ConfigOption.Value{value: &1})
      thread = owned_thread(
        agent: :claude,
        config_options: [%DevboxInstanceSession.ConfigOption{config_id: "autonomy", options: levels}],
        devbox_attrs: [autonomy: %Devbox.AutonomyPolicy{max: :full}]
      )

      {:ok, _} = Threads.set_config_option(thread.id, "autonomy", "full", thread.user)
      {:error, msg} = Threads.set_config_option(thread.id, "autonomy", "auto", thread.user)
      assert msg =~ "provider that serves decisions"
    end
  end

  describe "#list_commands/2" do
    test "it falls back to the indexed commands when the cluster is offline" do
      thread = owned_thread(available_commands: [%DevboxInstanceSession.Command{name: "review"}])
      expect(Control.Test, :list_commands, fn _, _ -> {:error, :not_connected} end)

      {:ok, [%{name: "review"}]} = Threads.list_commands(thread.id, thread.user)
    end
  end

  describe "#sessions/2" do
    test "it falls back to the index when the box is suspended" do
      thread = owned_thread()
      expect(Control.Test, :get_sessions, fn _ -> {:error, :suspended} end)

      {:ok, [%{id: id}]} = Threads.sessions(thread.instance_id, thread.user)
      assert id == thread.id
    end
  end

  describe "#timeline/4" do
    test "it resumes a suspended box and types its errors" do
      thread = owned_thread()
      expect(Control.Test, :get_timeline, fn _, "s1", _ -> {:error, :suspended} end)

      {:error, %{extensions: %{code: "INSTANCE_SUSPENDED"}}} = Threads.timeline(thread.instance_id, "s1", %{}, thread.user)
    end

    test "it passes the cursor through and rejects two" do
      thread = owned_thread()
      expect(Control.Test, :get_timeline, fn _, "s1", %{before: 12, limit: 50} -> {:ok, %{entities: [], has_more: true}} end)

      {:ok, %{has_more: true}} = Threads.timeline(thread.instance_id, "s1", %{before: 12, limit: 50}, thread.user)
      {:error, _} = Threads.timeline(thread.instance_id, "s1", %{before: 12, after: 3}, thread.user)
    end
  end

  describe "#respond/3" do
    test "it answers a permission request with an offered option" do
      thread = owned_thread()
      interaction = insert(:devbox_instance_interaction, instance: thread.instance, session: thread)
      expect(Control.Test, :respond, fn _, %{id: id}, %{option_id: "allow", principal: _} ->
        assert id == interaction.id
        :ok
      end)

      {:ok, answered} = Threads.respond(interaction.id, %{option_id: "allow"}, thread.user)

      assert answered.state == :answered
      assert answered.answered_by_id == thread.user_id
      assert answered.response == %{option_id: "allow"} || answered.response == %{"option_id" => "allow"}
    end

    test "it rejects options that weren't offered and answered requests" do
      thread = owned_thread()
      interaction = insert(:devbox_instance_interaction, instance: thread.instance, session: thread)
      answered = insert(:devbox_instance_interaction, instance: thread.instance, state: :answered)

      {:error, _} = Threads.respond(interaction.id, %{option_id: "nope"}, thread.user)
      {:error, _} = Threads.respond(answered.id, %{option_id: "allow"}, thread.user)
    end

    test "it answers elicitations" do
      thread = owned_thread()
      interaction = insert(:devbox_instance_interaction, instance: thread.instance, kind: :form_elicitation, options: [])

      {:ok, answered} = Threads.respond(interaction.id, %{action: :accept, content: %{"name" => "x"}}, thread.user)
      assert answered.state == :answered
    end
  end

  describe "#add_repository/3" do
    test "it adds allowed repositories" do
      inst = owned_instance(devbox_attrs: [allowed_repositories: ["https://github.com/pluralsh/console"]])

      {:ok, updated} = Threads.add_repository(inst.id, "https://github.com/pluralsh/console.git", inst.user)
      assert updated.repositories == ["https://github.com/pluralsh/console.git"]

      {:error, _} = Threads.add_repository(inst.id, "https://github.com/other/repo", inst.user)
    end
  end

  describe "#importable_sessions/2" do
    test "it filters out sessions console already tracks" do
      thread = owned_thread(acp_session_id: "known")
      expect(Control.Test, :list_sessions, fn _ -> {:ok, [%{session_id: "known"}, %{session_id: "new"}]} end)

      {:ok, [%{session_id: "new"}]} = Threads.importable_sessions(thread.instance_id, thread.user)
    end
  end

  describe "#import_thread/3" do
    test "it imports a session as a thread" do
      inst = owned_instance()

      {:ok, thread} = Threads.import_thread(%{agent: :claude, session_id: "outside", title: "external"}, inst.id, inst.user)

      assert thread.imported
      assert thread.acp_session_id == "outside"
    end
  end

  defp owned_instance(attrs \\ []) do
    user = insert(:user)
    {wb_attrs, attrs} = Keyword.pop(attrs, :workbench_attrs, [])
    {devbox_attrs, attrs} = Keyword.pop(attrs, :devbox_attrs, [])
    wb = insert(:workbench, Keyword.put(wb_attrs, :read_bindings, [%{user_id: user.id}]))
    insert(:devbox_instance, Keyword.merge(attrs, user: user, workbench: wb, devbox: insert(:devbox, devbox_attrs)))
    |> Console.Repo.preload([:user])
  end

  defp owned_thread(attrs \\ []) do
    {devbox_attrs, attrs} = Keyword.pop(attrs, :devbox_attrs, [])
    {inst_attrs, attrs} = Keyword.pop(attrs, :instance_attrs, [])
    inst = owned_instance(Keyword.put(inst_attrs, :devbox_attrs, devbox_attrs))
    insert(:devbox_instance_session, Keyword.merge(attrs, instance: inst, user: inst.user))
  end
end
