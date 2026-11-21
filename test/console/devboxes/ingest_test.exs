defmodule Console.Devboxes.IngestTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Devboxes.Ingest
  alias Console.Schema.{DevboxInstanceSession, DevboxInstanceInteraction, DevboxInstance, PullRequest, Workbench}
  alias Console.PubSub

  describe "#register_gateway/2" do
    test "it returns the live instances of the cluster with their leases" do
      inst = insert(:devbox_instance, viewer_lease_until: Timex.now() |> Timex.shift(minutes: 1))
      insert(:devbox_instance, devbox: inst.devbox, status: :cancelled)
      insert(:devbox_instance)

      {:ok, %{cluster_id: cid, instances: [summary]}} = Ingest.register_gateway(%{}, inst.devbox.cluster)

      assert cid == inst.devbox.cluster_id
      assert summary.instance_id == inst.id
      assert [%{kind: :viewer}] = summary.leases
    end
  end

  describe "#heartbeat/2" do
    test "it updates idle state and returns unknown or ended instances" do
      inst = insert(:devbox_instance)
      ended = insert(:devbox_instance, devbox: inst.devbox, status: :completed)
      unknown = Ecto.UUID.generate()

      {:ok, %{unknown_instance_ids: ids}} = Ingest.heartbeat(%{instances: [
        %{instance_id: inst.id, idle: %{idle: true, message: "no activity"}},
        %{instance_id: ended.id},
        %{instance_id: unknown}
      ]}, inst.devbox.cluster)

      assert Enum.sort(ids) == Enum.sort([ended.id, unknown])
      assert refetch(inst).idle_state.idle
    end

    test "a heartbeat replaces the previous idle state" do
      inst = insert(:devbox_instance, idle_state: %{idle: true, suspends_at: Timex.now(), message: "idle"})

      Ingest.heartbeat(%{instances: [%{instance_id: inst.id, idle: %{idle: false, message: "agent working"}}]}, inst.devbox.cluster)

      assert %{idle: false, suspends_at: nil, message: "agent working"} = refetch(inst).idle_state
    end

    test "busy reasons keep their kind" do
      inst = insert(:devbox_instance)

      Ingest.heartbeat(%{instances: [%{instance_id: inst.id, idle: %{idle: false, busy_reasons: [
        %{kind: :BUSY_REASON_KIND_AGENT_TURN, detail: "6bb88f0c", thread_id: "6bb88f0c"},
        %{kind: "BUSY_REASON_KIND_TOTALLY_NEW_KIND_#{System.unique_integer([:positive])}", detail: "x"}
      ]}}]}, inst.devbox.cluster)

      assert [%{"kind" => "agent_turn", "thread_id" => "6bb88f0c"}, %{"kind" => "totally_new_kind_" <> _}] =
               refetch(inst).idle_state.busy_reasons
    end
  end

  describe "#report_instance_status/2" do
    test "it applies valid transitions and notifies" do
      inst = insert(:devbox_instance, status: :pending)

      {:ok, updated} = Ingest.report_instance_status(%{
        instance_id: inst.id,
        status: :INSTANCE_STATUS_RUNNING,
        generation: 1,
        actor_id: "actor-1"
      }, inst.devbox.cluster)

      assert updated.status == :running
      assert updated.status_generation == 1
      assert updated.actor_ref == "actor-1"
      assert updated.started_at
      assert_receive {:event, %PubSub.DevboxInstanceUpdated{}}
    end

    test "resuming clears the idle state from before the suspend" do
      past = Timex.now() |> Timex.shift(minutes: -5)
      inst = insert(:devbox_instance, status: :suspended, idle_state: %{idle: true, idle_since: past, suspends_at: past})

      {:ok, updated} = Ingest.report_instance_status(%{instance_id: inst.id, status: :INSTANCE_STATUS_RUNNING, generation: 1}, inst.devbox.cluster)

      assert updated.status == :running
      assert %{idle: false, idle_since: nil, suspends_at: nil} = updated.idle_state
    end

    test "it ignores stale generations" do
      inst = insert(:devbox_instance, status: :running, status_generation: 5)

      {:ok, same} = Ingest.report_instance_status(%{instance_id: inst.id, status: :suspended, generation: 4}, inst.devbox.cluster)

      assert same.status == :running
    end

    test "ended instances stay ended" do
      inst = insert(:devbox_instance, status: :cancelled)

      {:ok, %{status: :cancelled}} = Ingest.report_instance_status(%{instance_id: inst.id, status: :running, generation: 1}, inst.devbox.cluster)
    end

    test "terminal reports revoke credentials" do
      inst = insert(:devbox_instance, status: :running)

      {:ok, failed} = Ingest.report_instance_status(%{instance_id: inst.id, status: :failed, error: %{message: "oom"}}, inst.devbox.cluster)

      assert failed.status == :failed
      assert failed.status_reason == "oom"
      assert failed.credentials_revoked_at
    end

    test "clusters can't report on other clusters' instances" do
      inst = insert(:devbox_instance)

      {:error, _} = Ingest.report_instance_status(%{instance_id: inst.id, status: :failed}, insert(:cluster))
    end
  end

  describe "#report_snapshot/2" do
    test "it marks a snapshot ready" do
      snapshot = insert(:devbox_snapshot, status: :pending, tag_ref: nil)

      {:ok, ready} = Ingest.report_snapshot(%{
        snapshot_id: snapshot.id,
        state: :SNAPSHOT_STATE_SUCCEEDED,
        snapshot: %{tag_ref: "registry/x@sha256:1", fidelity: :SNAPSHOT_FIDELITY_MEMORY},
        size_bytes: 1024
      }, snapshot.devbox.cluster)

      assert ready.status == :ready
      assert ready.tag_ref == "registry/x@sha256:1"
      assert ready.fidelity == :memory
      assert ready.size_bytes == 1024
    end

    test "it marks a snapshot failed" do
      snapshot = insert(:devbox_snapshot, status: :pending)

      {:ok, failed} = Ingest.report_snapshot(%{snapshot_id: snapshot.id, state: :failed, error: %{message: "push failed"}}, snapshot.devbox.cluster)

      assert failed.status == :failed
      assert failed.error == "push failed"
    end
  end

  describe "#upsert_instance_index/2" do
    test "a later turn without an error clears the last one" do
      inst = insert(:devbox_instance)
      thread = insert(:devbox_instance_session,
        instance: inst,
        acp_session_id: "s1",
        stop_reason: "error",
        error: %{"message" => "API Error: 400"}
      )

      {:ok, _} = Ingest.upsert_instance_index(%{
        instance_id: inst.id,
        sessions: [%{thread_id: thread.id, session_id: "s1", revision: 2, foreground: %{state: :FOREGROUND_STATE_KIND_RUNNING}}]
      }, inst.devbox.cluster)

      updated = refetch(thread)
      assert updated.foreground_state == :running
      refute updated.error
      refute updated.stop_reason

      {:ok, _} = Ingest.upsert_instance_index(%{
        instance_id: inst.id,
        sessions: [%{thread_id: thread.id, session_id: "s1", revision: 3, title: "renamed"}]
      }, inst.devbox.cluster)

      assert refetch(thread).title == "renamed"
    end

    test "it upserts sessions and interactions and links subagents" do
      inst = insert(:devbox_instance)
      thread = insert(:devbox_instance_session, instance: inst, acp_session_id: "parent")

      {:ok, %{sessions_applied: 2, interactions_applied: 1}} = Ingest.upsert_instance_index(%{
        instance_id: inst.id,
        sessions: [
          %{
            thread_id: thread.id,
            session_id: "parent",
            title: "agent title",
            revision: 2,
            cwd: "/home/agent/console",
            foreground: %{state: :FOREGROUND_STATE_KIND_RUNNING},
            config_options: [%{id: "mode", name: "Mode", current_value: "code", options: [%{value: "code"}]}],
            available_commands: [%{name: "review", input: %{hint: "a branch"}}]
          },
          %{session_id: "child", kind: :SESSION_KIND_SUBAGENT, parent_session_id: "parent", agent: :claude, status: :active, revision: 1}
        ],
        interactions: [
          %{
            interaction_id: "int-1",
            session_id: "parent",
            kind: :INTERACTION_KIND_PERMISSION,
            state: :INTERACTION_STATE_PENDING,
            title: "run rm -rf",
            permission: %{options: [%{option_id: "allow", name: "Allow", kind: "allow_once"}]},
            review: %{verdict: "ask", confidence: 0.9, risk: "destructive", model: "openai/gpt-6-luna", escalation: "the reviewer wants you to decide"},
            revision: 1
          }
        ],
        aggregate: %{revision: 3, foreground: :running, running_threads: 1, checkouts: [%{path: "~/console", branch: "main"}]}
      }, inst.devbox.cluster)

      updated = refetch(thread)
      assert updated.title == "agent title"
      assert updated.cwd == "~/console"
      assert updated.foreground_state == :running
      assert [%{config_id: "mode", current_value: "code"}] = updated.config_options
      assert [%{name: "review", input_hint: "a branch"}] = updated.available_commands

      child = Console.Repo.get_by!(DevboxInstanceSession, acp_session_id: "child")
      assert child.kind == :subagent
      assert child.parent_id == thread.id

      interaction = Console.Repo.get_by!(DevboxInstanceInteraction, external_id: "int-1")
      assert interaction.session_id == thread.id
      assert interaction.kind == :permission
      assert [%{option_id: "allow"}] = interaction.options
      assert %{verdict: "ask", risk: "destructive", escalation: "the reviewer wants you to decide"} = interaction.review

      inst = refetch(inst)
      assert inst.index_revision == 3
      assert inst.running_threads == 1
      assert [%{path: "~/console", branch: "main"}] = inst.checkouts

      assert_receive {:event, %PubSub.DevboxInstanceIndexUpdated{item: %DevboxInstance.IndexDelta{revision: 3, sessions: [_, _], interactions: [_]}}}
      assert_receive {:event, %PubSub.DevboxThreadUpdated{}}
    end

    test "it links a subagent indexed before its parent, in the same batch or a later one" do
      inst = insert(:devbox_instance)
      cluster = inst.devbox.cluster

      {:ok, %{sessions_applied: 3}} = Ingest.upsert_instance_index(%{
        instance_id: inst.id,
        sessions: [
          %{session_id: "child", kind: :SESSION_KIND_SUBAGENT, parent_session_id: "parent", status: :active, revision: 1},
          %{session_id: "parent", kind: :thread, status: :active, revision: 1},
          %{session_id: "orphan", kind: :SESSION_KIND_SUBAGENT, parent_session_id: "late", status: :active, revision: 1}
        ]
      }, cluster)

      parent = Console.Repo.get_by!(DevboxInstanceSession, acp_session_id: "parent")
      assert Console.Repo.get_by!(DevboxInstanceSession, acp_session_id: "child").parent_id == parent.id
      refute Console.Repo.get_by!(DevboxInstanceSession, acp_session_id: "orphan").parent_id

      {:ok, _} = Ingest.upsert_instance_index(%{
        instance_id: inst.id,
        sessions: [%{session_id: "late", kind: :thread, status: :active, revision: 1}]
      }, cluster)

      late = Console.Repo.get_by!(DevboxInstanceSession, acp_session_id: "late")
      assert Console.Repo.get_by!(DevboxInstanceSession, acp_session_id: "orphan").parent_id == late.id
    end

    test "it skips rows with older revisions" do
      inst = insert(:devbox_instance, index_revision: 10)
      thread = insert(:devbox_instance_session, instance: inst, revision: 5, title: "current")

      {:ok, %{sessions_applied: 0}} = Ingest.upsert_instance_index(%{
        instance_id: inst.id,
        sessions: [%{thread_id: thread.id, title: "old", revision: 4}],
        aggregate: %{revision: 9, running_threads: 7}
      }, inst.devbox.cluster)

      assert refetch(thread).title == "current"
      assert refetch(inst).running_threads == 0
      refute_receive {:event, %PubSub.DevboxInstanceIndexUpdated{}}
    end

    test "a failed row rolls back the whole batch" do
      inst = insert(:devbox_instance)
      thread = insert(:devbox_instance_session, instance: inst)

      {:error, _} = Ingest.upsert_instance_index(%{
        instance_id: inst.id,
        sessions: [%{thread_id: thread.id, title: "rolled back", revision: 1}],
        interactions: [%{interaction_id: "no-kind", thread_id: thread.id, state: :pending, revision: 1}],
        aggregate: %{revision: 1, running_threads: 1}
      }, inst.devbox.cluster)

      refute refetch(thread).title == "rolled back"
      assert refetch(inst).running_threads == 0
    end

    test "it rejects other clusters' instances" do
      inst = insert(:devbox_instance)
      thread = insert(:devbox_instance_session, instance: inst)

      {:error, _} = Ingest.upsert_instance_index(%{instance_id: inst.id, sessions: [%{thread_id: thread.id, title: "nope", revision: 1}]}, insert(:cluster))

      refute refetch(thread).title == "nope"
    end

    test "it charges usage deltas to the workbench budget, skipping subscription billing" do
      wb = insert(:workbench, budget: %Workbench.Budget{enabled: true, maximum: 1_000, min_free: 1, unit: :token, last: 1_000, last_updated: DateTime.utc_now()})
      inst = insert(:devbox_instance, workbench: wb)
      thread = insert(:devbox_instance_session, instance: inst)
      sub = insert(:devbox_instance_session, instance: inst)

      {:ok, _} = Ingest.upsert_instance_index(%{
        instance_id: inst.id,
        sessions: [
          %{thread_id: thread.id, revision: 1, usage: %{total_tokens: 100, cost: %{amount: 0.5}}},
          %{thread_id: sub.id, revision: 1, usage: %{total_tokens: 500, billing: :BILLING_MODE_SUBSCRIPTION}}
        ]
      }, inst.devbox.cluster)

      assert refetch(wb).budget.last == 900

      second = %{instance_id: inst.id, sessions: [%{thread_id: thread.id, revision: 2, usage: %{total_tokens: 150, cost: %{amount: 0.75}}}]}
      {:ok, _} = Ingest.upsert_instance_index(second, inst.devbox.cluster)
      {:ok, %{sessions_applied: 0}} = Ingest.upsert_instance_index(second, inst.devbox.cluster)

      assert refetch(wb).budget.last == 850
    end
  end

  describe "#publish_instance_deltas/2" do
    test "it broadcasts deltas for owned instances only" do
      inst = insert(:devbox_instance)
      other = insert(:devbox_instance)

      :ok = Ingest.publish_instance_deltas([
        %{instance_id: inst.id, session_id: "s", entity_id: "e1", op: :DELTA_OP_APPEND, payload_json: ~s({"text": "hi"})},
        %{instance_id: other.id, op: :append}
      ], inst.devbox.cluster)

      assert_receive {:event, %PubSub.DevboxInstanceDeltaCreated{item: %DevboxInstance.Delta{} = delta}}
      assert delta.instance_id == inst.id
      assert delta.op == :append
      assert delta.payload == %{"text" => "hi"}
      refute_receive {:event, %PubSub.DevboxInstanceDeltaCreated{}}
    end
  end

  describe "#get_instance_credentials/3" do
    test "it mints ai proxy and console credentials" do
      inst = insert(:devbox_instance)

      {:ok, [proxy, console]} = Ingest.get_instance_credentials(inst.id, [
        %{kind: :CREDENTIAL_KIND_AI_PROXY},
        %{kind: :console}
      ], inst.devbox.cluster)

      assert proxy.kind == :ai_proxy
      {:ok, _} = Console.Devboxes.Credentials.verify(proxy.token, "ai_proxy")
      {:error, _} = Console.Devboxes.Credentials.verify(proxy.token, "workbench_mcp")
      assert console.kind == :console
      assert DateTime.compare(proxy.refresh_after, proxy.expires_at) == :lt
    end

    test "it returns a typed error for unsupported kinds" do
      inst = insert(:devbox_instance)

      {:error, %{extensions: %{code: "UNSUPPORTED"}}} =
        Ingest.get_instance_credentials(inst.id, [%{kind: :CREDENTIAL_KIND_UNSPECIFIED}], inst.devbox.cluster)
    end

    test "oidc without cloud identities is an error" do
      inst = insert(:devbox_instance)

      {:error, "devbox " <> _} = Ingest.get_instance_credentials(inst.id, [%{kind: :CREDENTIAL_KIND_OIDC}], inst.devbox.cluster)
    end

    test "ended instances get no credentials" do
      inst = insert(:devbox_instance, status: :completed)

      {:error, _} = Ingest.get_instance_credentials(inst.id, [%{kind: :ai_proxy}], inst.devbox.cluster)
    end
  end

  describe "#devbox_pull_request/4" do
    test "it creates an attributed pull request" do
      insert(:scm_connection, default: true)
      inst = insert(:devbox_instance)
      thread = insert(:devbox_instance_session, instance: inst)
      subagent = insert(:devbox_instance_session, instance: inst, kind: :subagent, parent: thread)

      expect(Console.Deployments.Pr.Dispatcher, :pr, fn conn, "a pr", "a body", "https://github.com/pluralsh/console.git", "main", "devbox/branch", opts ->
        assert conn.commit_shas == %{"devbox/branch" => "head-sha", "main" => "base-sha"}
        assert opts[:draft]
        assert opts[:labels] == ["devbox"]
        {:ok, %{url: "https://github.com/pluralsh/console/pull/1", title: "a pr"}}
      end)

      {:ok, pr} = Ingest.devbox_pull_request(%{
        attributes: %{
          repository: "https://github.com/pluralsh/console.git",
          title: "a pr",
          body: "a body",
          base_branch: "main",
          head_branch: "devbox/branch",
          draft: true,
          labels: ["devbox"],
          difficulty: %{change_type: "GITOPS", lines: 42},
          commit_shas: [%{branch: "devbox/branch", sha: "head-sha"}, %{branch: "main", sha: "base-sha"}]
        },
        tool_call_id: "tc-1"
      }, inst.id, subagent.id, inst.devbox.cluster)

      assert pr.source == :mcp
      assert pr.devbox_id == inst.devbox_id
      assert pr.devbox_instance_id == inst.id
      assert pr.devbox_instance_session_id == thread.id
      assert pr.workbench_id == inst.workbench_id
      assert pr.difficulty.type == :gitops
      assert pr.difficulty.lines == 42
      assert pr.labels == ["devbox"]
      assert pr.metadata["tool_call_id"] || pr.metadata[:tool_call_id]
      assert_receive {:event, %PubSub.PullRequestCreated{}}
      assert_receive {:event, %PubSub.DevboxInstanceDeltaCreated{item: %{op: :pull_request}}}
    end

    test "it enforces the repository allowlist" do
      inst = insert(:devbox_instance, devbox: insert(:devbox, allowed_repositories: ["https://github.com/pluralsh/other"]))

      {:error, _} = Ingest.devbox_pull_request(%{
        repository: "https://github.com/pluralsh/console.git",
        title: "a pr",
        base_branch: "main",
        head_branch: "b"
      }, inst.id, nil, inst.devbox.cluster)
    end
  end

  describe "#report_observed_pull_request/2" do
    test "it records egress-observed pull requests once" do
      inst = insert(:devbox_instance)
      url = "https://github.com/pluralsh/console/pull/2"

      {:ok, %{pull_request: pr, created: true}} = Ingest.report_observed_pull_request(%{
        instance_id: inst.id,
        url: url,
        repository: "pluralsh/console",
        number: 2
      }, inst.devbox.cluster)

      assert pr.source == :egress
      assert pr.title == "pluralsh/console #2"
      assert pr.devbox_instance_id == inst.id

      {:ok, %{pull_request: %PullRequest{id: id}, created: false}} =
        Ingest.report_observed_pull_request(%{instance_id: inst.id, url: url}, inst.devbox.cluster)
      assert id == pr.id
    end
  end

  describe "#enum/2" do
    test "it normalizes proto enums" do
      assert Ingest.enum(:INSTANCE_STATUS_RUNNING, "instance_status_") == :running
      assert Ingest.enum(:running, "instance_status_") == :running
      assert Ingest.enum(:INSTANCE_STATUS_UNSPECIFIED, "instance_status_") == nil
      assert Ingest.enum("INSTANCE_STATUS_SOMETHING_UNKNOWN_XYZ", "instance_status_") == nil
    end
  end
end
