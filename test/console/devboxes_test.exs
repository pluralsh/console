defmodule Console.DevboxesTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.{Devboxes, PubSub}
  alias Console.Devboxes.Control
  alias Console.Schema.{Devbox, DevboxInstance, DevboxSnapshot, WorkbenchDevbox}

  @catalog %{
    name: "dev",
    image: "ghcr.io/pluralsh/devbox:1",
    max_instances: 2,
    agents: [
      %{
        type: :claude,
        default: true,
        probe_status: :ok,
        models: [%{id: "sonnet"}, %{id: "opus"}],
        default_model: "sonnet",
        config_options: [%{config_id: "mode", name: "Mode", options: [%{value: "plan"}, %{value: "code"}]}]
      },
      %{type: :codex, probe_status: :ok, models: [%{id: "gpt"}]}
    ]
  }

  describe "#upsert_devbox/3" do
    test "a cluster can create and update its devbox by name" do
      cluster = insert(:cluster)

      {:ok, devbox} = Devboxes.upsert_devbox(@catalog, cluster)

      assert devbox.cluster_id == cluster.id
      assert devbox.name == "dev"
      assert length(devbox.agents) == 2

      {:ok, updated} = Devboxes.upsert_devbox(%{@catalog | image: "ghcr.io/pluralsh/devbox:2"}, cluster)

      assert updated.id == devbox.id
      assert updated.image == "ghcr.io/pluralsh/devbox:2"
    end

    test "it resolves scm connections by name" do
      cluster = insert(:cluster)
      conn = insert(:scm_connection)

      {:ok, devbox} = Devboxes.upsert_devbox(Map.put(@catalog, :scm_connections, [conn.name]), cluster)

      %{scm_connections: [found]} = Console.Repo.preload(devbox, :scm_connections)
      assert found.id == conn.id

      {:error, _} = Devboxes.upsert_devbox(Map.put(@catalog, :scm_connections, ["missing"]), cluster)
    end

    test "it resolves create bindings by email and group name, keeping them stable across upserts" do
      cluster = insert(:cluster)
      user = insert(:user)
      group = insert(:group)
      bindings = [%{user_email: user.email}, %{group_name: group.name}, %{user_email: "nobody@example.com"}]

      {:ok, devbox} = Devboxes.upsert_devbox(Map.put(@catalog, :create_bindings, bindings), cluster)
      %{create_bindings: created} = Console.Repo.preload(devbox, :create_bindings)
      assert Enum.sort(Enum.map(created, & &1.user_id || &1.group_id)) == Enum.sort([user.id, group.id])

      {:ok, devbox} = Devboxes.upsert_devbox(Map.put(@catalog, :create_bindings, bindings), cluster)
      %{create_bindings: again} = Console.Repo.preload(devbox, :create_bindings)
      assert Enum.sort(Enum.map(again, & &1.id)) == Enum.sort(Enum.map(created, & &1.id))

      {:ok, devbox} = Devboxes.upsert_devbox(@catalog, cluster)
      assert Console.Repo.preload(devbox, :create_bindings).create_bindings == []
    end

    test "it stores the runner's autonomy policy, defaulting to auto" do
      cluster = insert(:cluster)

      {:ok, devbox} = Devboxes.upsert_devbox(@catalog, cluster)
      assert Devbox.autonomy(devbox) == %{default: :auto, max: :auto}

      {:ok, devbox} = Devboxes.upsert_devbox(Map.put(@catalog, :autonomy, %{default: :full, max: :manual}), cluster)
      assert Devbox.autonomy(devbox) == %{default: :manual, max: :manual}
      refute Devbox.autonomy_allowed?(devbox, "auto")

      {:ok, devbox} = Devboxes.upsert_devbox(Map.put(@catalog, :autonomy, %{max: :full}), cluster)
      assert Devbox.autonomy_allowed?(devbox, "full")
    end

    test "it requires exactly one default agent" do
      cluster = insert(:cluster)
      agents = Enum.map(@catalog.agents, &Map.put(&1, :default, false))

      {:error, _} = Devboxes.upsert_devbox(%{@catalog | agents: agents}, cluster)
    end

    test "a cluster cannot modify another cluster's devbox" do
      devbox = insert(:devbox)

      {:error, _} = Devboxes.heartbeat_devbox(%{status: :ready}, devbox.id, insert(:cluster))
    end
  end

  describe "#heartbeat_devbox/3" do
    test "it records status, conditions and the resolved image" do
      devbox = insert(:devbox, status: :pending)

      {:ok, beat} = Devboxes.heartbeat_devbox(%{
        status: :degraded,
        resolved_image: "ghcr.io/pluralsh/devbox@sha256:1",
        conditions: [%{type: "Ready", status: "False", message: "pull failed"}]
      }, devbox.id, devbox.cluster)

      assert beat.status == :degraded
      assert beat.resolved_image == "ghcr.io/pluralsh/devbox@sha256:1"
      assert [%{type: "Ready"}] = beat.conditions
      assert beat.last_heartbeat_at
    end
  end

  describe "#delete_devbox/2" do
    test "a cluster can delete its devbox, unless snapshots exist" do
      devbox = insert(:devbox)
      insert(:devbox_snapshot, devbox: devbox)

      {:error, _} = Devboxes.delete_devbox(devbox.id, devbox.cluster)

      other = insert(:devbox)
      {:ok, _} = Devboxes.delete_devbox(other.id, other.cluster)
      refute refetch(other)
    end
  end

  describe "#mint_probe_token/2" do
    test "it mints a box-scoped probe token for the box's cluster" do
      devbox = insert(:devbox)

      {:ok, token, _} = Devboxes.mint_probe_token(devbox.id, devbox.cluster)

      {:ok, %{"sub" => sub, "scopes" => ["probe"]}} = Console.Guardian.decode_and_verify(token, %{"typ" => "devbox"})
      assert sub == "devbox:#{devbox.id}"
      {:error, _} = Devboxes.mint_probe_token(devbox.id, insert(:cluster))
    end
  end

  describe "#attach_devbox/3" do
    test "workbench writers with create access to the devbox can attach and detach it" do
      user = insert(:user)
      workbench = insert(:workbench, write_bindings: [%{user_id: user.id}])
      devbox = insert(:devbox, create_bindings: [%{user_id: user.id}])

      {:ok, %WorkbenchDevbox{}} = Devboxes.attach_devbox(workbench.id, devbox.id, user)
      {:ok, _} = Devboxes.detach_devbox(workbench.id, devbox.id, user)
      {:error, _} = Devboxes.detach_devbox(workbench.id, devbox.id, user)
    end

    test "group create bindings grant attach" do
      user = insert(:user)
      group = insert(:group)
      insert(:group_member, user: user, group: group)
      workbench = insert(:workbench, write_bindings: [%{user_id: user.id}])
      devbox = insert(:devbox, create_bindings: [%{group_id: group.id}])

      {:ok, %WorkbenchDevbox{}} = Devboxes.attach_devbox(workbench.id, devbox.id, Console.Repo.preload(user, [:groups]))
    end

    test "without devbox bindings it falls back to the global create policy" do
      user = insert(:user)
      workbench = insert(:workbench, write_bindings: [%{user_id: user.id}])
      devbox = insert(:devbox)

      {:error, "forbidden"} = Devboxes.attach_devbox(workbench.id, devbox.id, user)

      deployment_settings(create_bindings: [%{user_id: user.id}])
      {:ok, %WorkbenchDevbox{}} = Devboxes.attach_devbox(workbench.id, devbox.id, user)
    end

    test "workbench writers without create access to the devbox cannot attach it" do
      user = insert(:user)
      workbench = insert(:workbench, write_bindings: [%{user_id: user.id}])
      devbox = insert(:devbox, create_bindings: [%{user_id: insert(:user).id}])

      {:error, "forbidden"} = Devboxes.attach_devbox(workbench.id, devbox.id, user)
    end

    test "readers cannot attach a devbox" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])

      {:error, _} = Devboxes.attach_devbox(workbench.id, insert(:devbox, create_bindings: [%{user_id: user.id}]).id, user)
    end
  end

  describe "#create_instance/3" do
    setup :attached

    test "workbench readers can start an instance with the catalog defaults", %{user: user, workbench: wb, devbox: devbox} do
      expect(Control.Test, :create_instance, fn %DevboxInstance{}, %{devbox: %{id: id}, idle_policy: policy} ->
        assert id == devbox.id
        assert policy.max_deferral == 3_600
        refute Console.Repo.in_transaction?()
        :ok
      end)

      {:ok, inst} = Devboxes.create_instance(%{devbox_id: devbox.id}, wb.id, user)

      assert inst.status == :pending
      assert inst.agent == :claude
      assert inst.requested_model == "sonnet"
      assert inst.user_id == user.id
      assert inst.template_revision == devbox.template_revision
      assert inst.name =~ ~r/^[a-z]+-[a-z]+$/
      assert_receive {:event, %Console.PubSub.DevboxInstanceCreated{item: %{id: id}}}
      assert id == inst.id
    end

    test "it keeps a name the user gives", %{user: user, workbench: wb, devbox: devbox} do
      expect(Control.Test, :create_instance, fn _, _ -> :ok end)

      {:ok, inst} = Devboxes.create_instance(%{devbox_id: devbox.id, name: "my-box"}, wb.id, user)

      assert inst.name == "my-box"
    end

    test "it validates the agent, model and config options", %{user: user, workbench: wb, devbox: devbox} do
      {:ok, inst} = Devboxes.create_instance(%{
        devbox_id: devbox.id,
        agent: :claude,
        model: "opus",
        config_options: [%{config_id: "mode", value: "plan"}]
      }, wb.id, user)

      assert inst.requested_model == "opus"
      assert inst.config_options == %{"mode" => "plan"}

      {:error, _} = Devboxes.create_instance(%{devbox_id: devbox.id, model: "haiku"}, wb.id, user)
      {:error, _} = Devboxes.create_instance(%{devbox_id: devbox.id, agent: :gemini}, wb.id, user)
      {:error, _} = Devboxes.create_instance(%{devbox_id: devbox.id, config_options: [%{config_id: "mode", value: "yolo"}]}, wb.id, user)
    end

    test "auto autonomy needs the agent billed to a subscription", %{user: user, workbench: wb, devbox: devbox} do
      {:error, msg} = Devboxes.create_instance(%{devbox_id: devbox.id, config_options: [%{config_id: "autonomy", value: "auto"}]}, wb.id, user)
      assert msg =~ "provider that serves decisions"

      {:ok, inst} = Devboxes.create_instance(%{devbox_id: devbox.id, config_options: [%{config_id: "autonomy", value: "manual"}]}, wb.id, user)
      assert inst.config_options == %{"autonomy" => "manual"}
    end

    test "auto autonomy on the AI proxy when a decision model can review", %{user: user, workbench: wb, devbox: devbox} do
      deployment_settings(ai: %{enabled: true, provider: :anthropic, anthropic: %{access_token: "key"}})

      {:ok, inst} = Devboxes.create_instance(%{devbox_id: devbox.id, config_options: [%{config_id: "autonomy", value: "auto"}]}, wb.id, user)
      assert inst.config_options == %{"autonomy" => "auto"}
      assert Devboxes.decision_review?()
    end

    test "it enforces the repository allowlist", %{user: user, workbench: wb, devbox: devbox} do
      {:error, _} = Devboxes.create_instance(%{devbox_id: devbox.id, repositories: ["https://github.com/other/repo"]}, wb.id, user)

      {:ok, inst} = Devboxes.create_instance(%{devbox_id: devbox.id, repositories: ["https://github.com/pluralsh/console.git"]}, wb.id, user)
      assert inst.repositories == ["https://github.com/pluralsh/console.git"]
    end

    test "it enforces max instances", %{user: user, workbench: wb, devbox: devbox} do
      insert(:devbox_instance, devbox: devbox, workbench: wb)
      insert(:devbox_instance, devbox: devbox, workbench: wb)
      insert(:devbox_instance, devbox: devbox, workbench: wb, status: :cancelled)

      {:error, msg} = Devboxes.create_instance(%{devbox_id: devbox.id}, wb.id, user)
      assert msg =~ "limit"
    end

    test "it rejects devboxes not attached to the workbench", %{user: user, workbench: wb} do
      {:error, _} = Devboxes.create_instance(%{devbox_id: insert(:devbox).id}, wb.id, user)
    end

    test "users without access cannot start instances", %{workbench: wb, devbox: devbox} do
      {:error, _} = Devboxes.create_instance(%{devbox_id: devbox.id}, wb.id, insert(:user))
    end

    test "workbench readers outside the devbox's create bindings cannot start instances", %{devbox: devbox} do
      reader = insert(:user)
      wb = insert(:workbench, read_bindings: [%{user_id: reader.id}])
      insert(:workbench_devbox, workbench: wb, devbox: devbox)

      {:error, "forbidden"} = Devboxes.create_instance(%{devbox_id: devbox.id}, wb.id, reader)
    end

    test "it returns a typed error when the cluster is offline, failing the instance", %{user: user, workbench: wb, devbox: devbox} do
      expect(Control.Test, :create_instance, fn _, _ -> {:error, :not_connected} end)

      {:error, %{extensions: %{code: "CLUSTER_OFFLINE"}}} = Devboxes.create_instance(%{devbox_id: devbox.id}, wb.id, user)

      [inst] = Console.Repo.all(DevboxInstance)
      assert inst.status == :failed
      assert inst.status_reason =~ "could not start on the cluster"
      assert inst.credentials_revoked_at
      assert_receive {:event, %PubSub.DevboxInstanceEnded{item: %{id: id}}}
      assert id == inst.id
    end

    test "a failed start doesn't count against max instances", %{user: user, workbench: wb, devbox: devbox} do
      expect(Control.Test, :create_instance, 3, fn _, _ -> {:error, "boom"} end)

      for _ <- 1..3, do: {:error, "boom"} = Devboxes.create_instance(%{devbox_id: devbox.id}, wb.id, user)
    end

    test "it restores snapshots, falling back to filesystem fidelity on a new template", %{user: user, workbench: wb, devbox: devbox} do
      src = insert(:devbox_instance, devbox: devbox, workbench: wb)
      snapshot = insert(:devbox_snapshot, workbench: wb, devbox: devbox, instance: src, fidelity: :memory, template_revision: "rev-0")

      {:ok, inst} = Devboxes.create_instance(%{snapshot_id: snapshot.id}, wb.id, user)

      assert inst.snapshot_id == snapshot.id
      assert inst.devbox_id == devbox.id
      assert inst.restore_fidelity == :filesystem
    end

    test "it rejects snapshots that aren't ready", %{user: user, workbench: wb, devbox: devbox} do
      snapshot = insert(:devbox_snapshot, workbench: wb, devbox: devbox, status: :pending)

      {:error, _} = Devboxes.create_instance(%{snapshot_id: snapshot.id}, wb.id, user)
    end
  end

  describe "#cancel_instance/2" do
    test "the owner can cancel, which revokes credentials" do
      inst = insert(:devbox_instance)
      {:ok, token, _} = Console.Devboxes.Credentials.mint_ai_proxy_token(inst)

      {:ok, cancelled} = Devboxes.cancel_instance(inst.id, inst.user)

      assert cancelled.status == :cancelled
      assert cancelled.completed_at
      assert cancelled.credentials_revoked_at
      {:error, _} = Console.Devboxes.Credentials.verify_ai_proxy(token)
    end

    test "it leaves deleting the actor to the DevboxInstanceEnded event" do
      inst = insert(:devbox_instance)
      reject(Control.Test, :cancel_instance, 1)

      {:ok, %{status: :cancelled}} = Devboxes.cancel_instance(inst.id, inst.user)

      assert_receive {:event, %PubSub.DevboxInstanceEnded{item: %{id: id, status: :cancelled}}}
      assert id == inst.id
    end

    test "workbench readers that don't own the instance cannot cancel it" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))

      {:error, _} = Devboxes.cancel_instance(inst.id, user)
    end

    test "ended instances cannot be cancelled" do
      inst = insert(:devbox_instance, status: :completed)

      {:error, _} = Devboxes.cancel_instance(inst.id, inst.user)
    end
  end

  describe "#suspend_instance/2 and #resume_instance/2" do
    test "they only ask the gateway" do
      inst = owned_instance()
      expect(Control.Test, :suspend_instance, fn _ -> :ok end)

      {:ok, %{status: :running}} = Devboxes.suspend_instance(inst.id, inst.user)
      {:error, _} = Devboxes.resume_instance(inst.id, inst.user)

      suspended = owned_instance(status: :suspended)
      expect(Control.Test, :resume_instance, fn _ -> :ok end)
      {:ok, _} = Devboxes.resume_instance(suspended.id, suspended.user)
    end

    test "resuming restarts the completeAfter clock, so cleanup can't end an instance mid-resume" do
      inst = owned_instance(status: :suspended, suspended_at: Timex.now() |> Timex.shift(days: -15))
      expect(Control.Test, :resume_instance, fn _ -> :ok end)

      {:ok, _} = Devboxes.resume_instance(inst.id, inst.user)

      assert Devboxes.complete_stale_instances() == []
      assert refetch(inst).status == :suspended
    end

    test "a wake that outlasts the call is accepted, while failures stay errors" do
      inst = owned_instance(status: :suspended)
      expect(Control.Test, :resume_instance, fn _ -> {:error, :starting} end)
      {:ok, _} = Devboxes.resume_instance(inst.id, inst.user)

      expect(Control.Test, :resume_instance, fn _ -> {:error, "resuming instance: actor crashed"} end)
      {:error, "resuming instance: actor crashed"} = Devboxes.resume_instance(inst.id, inst.user)
    end
  end

  describe "#complete_stale_instances/0" do
    test "it completes instances suspended longer than completeAfter" do
      stale = insert(:devbox_instance, status: :suspended, suspended_at: Timex.now() |> Timex.shift(days: -15))
      fresh = insert(:devbox_instance, status: :suspended, suspended_at: Timex.now() |> Timex.shift(days: -1))

      reject(Control.Test, :cancel_instance, 1)

      [completed] = Devboxes.complete_stale_instances()

      assert completed.id == stale.id
      assert completed.status == :completed
      assert refetch(fresh).status == :suspended
      assert_receive {:event, %PubSub.DevboxInstanceEnded{item: %{id: id, status: :completed}}}
      assert id == stale.id
    end
  end

  describe "#fail_unstarted_instances/0" do
    test "it fails instances that stayed pending, as they never reached their cluster" do
      stuck = insert(:devbox_instance, status: :pending, inserted_at: Timex.now() |> Timex.shift(minutes: -15))
      fresh = insert(:devbox_instance, status: :pending)
      started = insert(:devbox_instance, status: :provisioning, inserted_at: Timex.now() |> Timex.shift(minutes: -15))

      [failed] = Devboxes.fail_unstarted_instances()

      assert failed.id == stuck.id
      assert failed.status == :failed
      assert failed.status_reason == "never reached its cluster"
      assert refetch(fresh).status == :pending
      assert refetch(started).status == :provisioning
    end
  end

  describe "#create_snapshot/3" do
    test "it creates a pending snapshot and asks the gateway" do
      inst = owned_instance()
      expect(Control.Test, :snapshot_instance, fn %{id: id}, %DevboxSnapshot{status: :pending} ->
        assert id == inst.id
        refute Console.Repo.in_transaction?()
        :ok
      end)

      {:ok, snapshot} = Devboxes.create_snapshot(%{name: "before upgrade"}, inst.id, inst.user)

      assert snapshot.status == :pending
      assert snapshot.workbench_id == inst.workbench_id
      assert snapshot.devbox_id == inst.devbox_id
      assert snapshot.name == "before upgrade"
    end

    test "a snapshot the gateway refuses is failed" do
      inst = owned_instance()
      expect(Control.Test, :snapshot_instance, fn _, _ -> {:error, :not_connected} end)

      {:error, %{extensions: %{code: "CLUSTER_OFFLINE"}}} = Devboxes.create_snapshot(%{}, inst.id, inst.user)

      [snapshot] = Console.Repo.all(DevboxSnapshot)
      assert snapshot.status == :failed
      assert snapshot.error
    end
  end

  describe "#delete_snapshot/2" do
    test "the owner can delete a ready snapshot" do
      user = insert(:user)
      snapshot = insert(:devbox_snapshot, user: user, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))

      {:ok, _} = Devboxes.delete_snapshot(snapshot.id, user)
      refute refetch(snapshot)
    end

    test "other readers cannot delete it" do
      user = insert(:user)
      snapshot = insert(:devbox_snapshot, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))

      {:error, _} = Devboxes.delete_snapshot(snapshot.id, user)
    end

    test "it fails while the cluster is offline" do
      snapshot = insert(:devbox_snapshot, user: insert(:user))
      expect(Control.Test, :delete_snapshot, fn _ -> {:error, :not_connected} end)

      {:error, %{extensions: %{code: "CLUSTER_OFFLINE"}}} = Devboxes.delete_snapshot(snapshot.id, admin_user())
      assert refetch(snapshot)
    end
  end

  describe "#prune_snapshots/1" do
    test "it deletes the oldest ready snapshots beyond maxSnapshots" do
      wb = insert(:workbench, configuration: devbox_config(max_snapshots: 1))
      old = insert(:devbox_snapshot, workbench: wb, inserted_at: Timex.now() |> Timex.shift(hours: -2))
      new = insert(:devbox_snapshot, workbench: wb)

      [pruned] = Devboxes.prune_snapshots(wb.id)

      assert pruned.id == old.id
      assert refetch(new)
    end
  end

  describe "presence and keep-awake" do
    test "pinging extends the viewer lease and pushes it to the gateway" do
      inst = owned_instance()
      expect(Control.Test, :set_instance_leases, fn _, %{generation: 1, leases: [%{kind: :viewer}]} -> :ok end)

      {:ok, pinged} = Devboxes.ping_instance(inst.id, inst.user)

      assert pinged.viewer_lease_until
      assert Map.has_key?(pinged.viewers, inst.user_id)
      assert pinged.lease_generation == 1

      {:ok, left} = Devboxes.leave_instance(inst.id, inst.user)
      assert left.viewers == %{}
    end

    test "pinging a suspended instance resumes it" do
      inst = owned_instance(status: :suspended)
      expect(Control.Test, :resume_instance, fn _ -> :ok end)

      {:ok, _} = Devboxes.ping_instance(inst.id, inst.user)
    end

    test "keep awake is clamped to the box's max deferral and narrowed by the workbench" do
      inst = owned_instance(workbench_attrs: [configuration: devbox_config(max_deferral: 3_600)])

      {:ok, kept} = Devboxes.keep_awake(inst.id, Timex.now() |> Timex.shift(days: 2), inst.user)

      assert DateTime.diff(kept.keep_awake_until, DateTime.utc_now()) <= 3_600
      assert kept.keep_awake_by_id == inst.user_id

      {:ok, cancelled} = Devboxes.cancel_keep_awake(inst.id, inst.user)
      refute cancelled.keep_awake_until
    end
  end

  defp owned_instance(attrs \\ []) do
    user = insert(:user)
    {wb_attrs, attrs} = Keyword.pop(attrs, :workbench_attrs, [])
    wb = insert(:workbench, Keyword.put(wb_attrs, :read_bindings, [%{user_id: user.id}]))
    insert(:devbox_instance, Keyword.merge(attrs, user: user, workbench: wb))
  end

  defp devbox_config(attrs) do
    %Console.Schema.Workbench.Configuration{devbox: struct(Console.Schema.Workbench.Configuration.Devbox, attrs)}
  end

  defp attached(_) do
    user = insert(:user)
    wb = insert(:workbench, read_bindings: [%{user_id: user.id}], configuration: devbox_config(max_deferral: 3_600))
    devbox = insert(:devbox,
      create_bindings: [%{user_id: user.id}],
      max_instances: 2,
      allowed_repositories: ["https://github.com/pluralsh/console"],
      agents: [
        %Console.Schema.Devbox.Agent{
          type: :claude,
          default: true,
          probe_status: :ok,
          default_model: "sonnet",
          models: [%Console.Schema.Devbox.Agent.Model{id: "sonnet"}, %Console.Schema.Devbox.Agent.Model{id: "opus"}],
          config_options: [
            %Console.Schema.DevboxInstanceSession.ConfigOption{
              config_id: "mode",
              name: "Mode",
              options: [
                %Console.Schema.DevboxInstanceSession.ConfigOption.Value{value: "plan"},
                %Console.Schema.DevboxInstanceSession.ConfigOption.Value{value: "code"}
              ]
            },
            %Console.Schema.DevboxInstanceSession.ConfigOption{
              config_id: "autonomy",
              name: "Autonomy",
              options: Enum.map(~w(manual auto), &%Console.Schema.DevboxInstanceSession.ConfigOption.Value{value: &1})
            }
          ]
        }
      ]
    )
    insert(:workbench_devbox, workbench: wb, devbox: devbox)
    {:ok, user: user, workbench: wb, devbox: devbox}
  end
end
