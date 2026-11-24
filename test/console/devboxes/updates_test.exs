defmodule Console.Devboxes.UpdatesTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Devboxes.{Control, Updates}
  alias Console.Schema.{DevboxInstance, DevboxUpdateCampaign}

  describe "DevboxInstance.outdated?/1" do
    test "an instance is outdated when its revision isn't the one its box serves" do
      devbox = insert(:devbox, revision: 3)

      assert DevboxInstance.outdated?(insert(:devbox_instance, devbox: devbox, template_revision: "2"))
      refute DevboxInstance.outdated?(insert(:devbox_instance, devbox: devbox, template_revision: "3"))
      refute DevboxInstance.outdated?(insert(:devbox_instance, devbox: devbox, template_revision: nil))
      # until the gateway reports, an instance holds the template name console created it with
      refute DevboxInstance.outdated?(insert(:devbox_instance, devbox: devbox, template_revision: "devbox-r2"))
      refute DevboxInstance.outdated?(insert(:devbox_instance, devbox: devbox, template_revision: "2", status: :completed))
      # a box whose operator doesn't report the number yet
      refute DevboxInstance.outdated?(insert(:devbox_instance, devbox: insert(:devbox), template_revision: "2"))
    end

    test "the query agrees" do
      devbox = insert(:devbox, revision: 3)
      old = insert(:devbox_instance, devbox: devbox, template_revision: "2")
      insert(:devbox_instance, devbox: devbox, template_revision: "3")
      insert(:devbox_instance, devbox: devbox, template_revision: nil)
      insert(:devbox_instance, devbox: devbox, template_revision: "devbox-r2")
      insert(:devbox_instance, devbox: devbox, template_revision: "2", status: :cancelled)
      insert(:devbox_instance, devbox: insert(:devbox), template_revision: "2")

      assert Updates.outdated_count(devbox.id) == 1
      [%{id: id}] = DevboxInstance.for_devbox(devbox.id) |> DevboxInstance.live() |> DevboxInstance.outdated() |> Repo.all()
      assert id == old.id
    end
  end

  describe "#rebase_instance/2" do
    test "an owner can update their outdated instance" do
      inst = outdated_instance()
      me = self()
      expect(Control.Test, :rebase_instance, fn %{id: id}, opts ->
        send(me, {:rebase, id, opts})
        {:ok, %{accepted: true}}
      end)

      {:ok, updated} = Updates.rebase_instance(inst.id, inst.user)

      assert updated.rebase_state == :in_progress
      assert updated.rebase_requested_at
      id = inst.id
      assert_receive {:rebase, ^id, %{principal: %{id: user_id}}}
      assert user_id == inst.user.id
      assert_receive {:event, %PubSub.DevboxInstanceUpdated{item: %{id: ^id}}}
    end

    test "it refuses an instance that is already current, has ended, or isn't yours" do
      current = outdated_instance(template_revision: "3")
      {:error, msg} = Updates.rebase_instance(current.id, current.user)
      assert msg =~ "already on its box's current revision"

      ended = outdated_instance(status: :completed)
      {:error, _} = Updates.rebase_instance(ended.id, ended.user)

      inst = outdated_instance()
      {:error, _} = Updates.rebase_instance(inst.id, insert(:user))
    end

    test "an instance the gateway already has on the revision isn't left updating" do
      inst = outdated_instance()
      expect(Control.Test, :rebase_instance, fn _, _ -> {:ok, %{accepted: false}} end)

      {:ok, same} = Updates.rebase_instance(inst.id, inst.user)

      refute same.rebase_state
      assert same.rebase_requested_at
    end

    test "a gateway failure leaves the instance as it was" do
      inst = outdated_instance()
      expect(Control.Test, :rebase_instance, fn _, _ -> {:error, :not_connected} end)

      {:error, %{extensions: %{code: "CLUSTER_OFFLINE"}}} = Updates.rebase_instance(inst.id, inst.user)

      refute refetch(inst).rebase_state
    end
  end

  describe "#create_campaign/3 and #cancel_campaign/2" do
    test "someone who can write the box can update it, only admins can force it" do
      devbox = insert(:devbox, revision: 3)
      admin = admin_user()

      {:error, _} = Updates.create_campaign(%{}, devbox.id, insert(:user))

      {:ok, campaign} = Updates.create_campaign(%{reason: "new base image"}, devbox.id, admin)
      assert campaign.status == :pending
      refute campaign.force
      refute campaign.deadline_at
      assert campaign.user_id == admin.id
      assert DateTime.diff(campaign.expires_at, campaign.starts_at, :hour) == 24

      {:error, msg} = Updates.create_campaign(%{}, devbox.id, admin)
      assert msg =~ "already running"

      {:ok, cancelled} = Updates.cancel_campaign(campaign.id, admin)
      assert cancelled.status == :cancelled
      {:error, _} = Updates.cancel_campaign(campaign.id, admin)

      # a start time in the past doesn't eat into the notice
      past = Timex.shift(DateTime.utc_now(), hours: -1)
      {:ok, forced} = Updates.create_campaign(%{force: true, starts_at: past}, devbox.id, admin)
      assert forced.notice_minutes == 15
      assert DateTime.diff(forced.deadline_at, forced.starts_at, :minute) == 15
      assert DateTime.diff(forced.deadline_at, DateTime.utc_now(), :minute) >= 14
    end

    test "a forced campaign needs an admin and a notice of 10 to 30 minutes" do
      devbox = insert(:devbox, revision: 3)
      writer = insert(:user)
      deployment_settings(write_bindings: [%{user_id: writer.id}])

      {:ok, _} = Updates.create_campaign(%{}, devbox.id, writer)
      Repo.delete_all(DevboxUpdateCampaign)

      {:error, msg} = Updates.create_campaign(%{force: true}, devbox.id, writer)
      assert msg =~ "only admins"

      {:error, _} = Updates.create_campaign(%{force: true, notice_minutes: 2}, devbox.id, admin_user())
      {:error, _} = Updates.create_campaign(%{force: true, notice_minutes: 120}, devbox.id, admin_user())
      {:ok, %{notice_minutes: 30}} = Updates.create_campaign(%{force: true, notice_minutes: 30}, devbox.id, admin_user())
    end

    test "a box that hasn't reported a revision can't be updated" do
      {:error, msg} = Updates.create_campaign(%{}, insert(:devbox).id, admin_user())
      assert msg =~ "hasn't reported a template revision"
    end
  end

  describe "#advance/2" do
    test "an ordinary campaign updates suspended and idle instances and leaves the ones in use alone" do
      devbox = insert(:devbox, revision: 3)
      suspended = insert(:devbox_instance, devbox: devbox, template_revision: "2", status: :suspended)
      idle = insert(:devbox_instance, devbox: devbox, template_revision: "2", idle_state: %{idle: true})
      busy = insert(:devbox_instance, devbox: devbox, template_revision: "2", idle_state: %{idle: false})
      current = insert(:devbox_instance, devbox: devbox, template_revision: "3", status: :suspended)
      campaign = insert(:devbox_update_campaign, devbox: devbox)
      me = self()
      stub(Control.Test, :rebase_instance, fn %{id: id}, _ ->
        send(me, {:rebase, id})
        {:ok, %{accepted: true}}
      end)

      {:ok, %{status: :running}} = Updates.advance(campaign)

      assert_receive {:rebase, id1}
      assert_receive {:rebase, id2}
      refute_receive {:rebase, _}
      assert Enum.sort([id1, id2]) == Enum.sort([suspended.id, idle.id])

      assert %{rebase_state: :in_progress, update_campaign_id: cid, rebase_attempts: 1} = refetch(suspended)
      assert cid == campaign.id
      refute refetch(busy).rebase_state
      refute refetch(busy).update_deadline_at
      refute refetch(current).rebase_state

      # what was just requested isn't requested again while it is in flight
      {:ok, _} = Updates.advance(refetch(campaign))
      refute_receive {:rebase, _}
    end

    test "it respects the campaign's concurrency, suspended instances first" do
      devbox = insert(:devbox, revision: 3)
      insert_list(2, :devbox_instance, devbox: devbox, template_revision: "2", idle_state: %{idle: true})
      suspended = insert(:devbox_instance, devbox: devbox, template_revision: "2", status: :suspended)
      campaign = insert(:devbox_update_campaign, devbox: devbox, max_concurrency: 2)
      me = self()
      stub(Control.Test, :rebase_instance, fn %{id: id}, _ ->
        send(me, {:rebase, id})
        {:ok, %{accepted: true}}
      end)

      {:ok, _} = Updates.advance(campaign)

      assert_receive {:rebase, first}
      assert first == suspended.id
      assert_receive {:rebase, _}
      refute_receive {:rebase, _}

      # both slots are taken until those report
      {:ok, _} = Updates.advance(refetch(campaign))
      refute_receive {:rebase, _}
    end

    test "a forced campaign warns people first and restarts their instances at the deadline" do
      devbox = insert(:devbox, revision: 3)
      busy = insert(:devbox_instance, devbox: devbox, template_revision: "2", idle_state: %{idle: false})
      now = DateTime.utc_now()
      campaign = insert(:devbox_update_campaign,
        devbox: devbox,
        force: true,
        notice_minutes: 15,
        starts_at: now,
        deadline_at: Timex.shift(now, minutes: 15)
      )
      me = self()
      stub(Control.Test, :rebase_instance, fn %{id: id}, _ ->
        send(me, {:rebase, id})
        {:ok, %{accepted: true}}
      end)

      {:ok, _} = Updates.advance(campaign, now)

      refute_receive {:rebase, _}
      warned = refetch(busy)
      assert DateTime.compare(warned.update_deadline_at, campaign.deadline_at) == :eq
      assert warned.update_campaign_id == campaign.id
      id = busy.id
      assert_receive {:event, %PubSub.DevboxInstanceUpdated{item: %{id: ^id}}}

      {:ok, _} = Updates.advance(refetch(campaign), Timex.shift(now, minutes: 16))

      assert_receive {:rebase, ^id}
      assert refetch(busy).rebase_state == :in_progress
    end

    test "it retries a failed update, gives up after three attempts and then completes" do
      devbox = insert(:devbox, revision: 3)
      campaign = insert(:devbox_update_campaign, devbox: devbox, status: :running)
      long_ago = Timex.shift(DateTime.utc_now(), minutes: -30)
      inst = insert(:devbox_instance,
        devbox: devbox,
        template_revision: "2",
        status: :suspended,
        rebase_state: :failed,
        rebase_attempts: 2,
        rebase_requested_at: long_ago,
        update_campaign: campaign
      )
      expect(Control.Test, :rebase_instance, fn _, _ -> {:ok, %{accepted: true}} end)

      {:ok, %{status: :running}} = Updates.advance(campaign)
      assert refetch(inst).rebase_attempts == 3

      # the third attempt failed too (the gateway reported it and rolled the instance back)
      refetch(inst)
      |> DevboxInstance.changeset(%{rebase_state: :failed, rebase_requested_at: long_ago})
      |> Repo.update!()

      {:ok, done} = Updates.advance(refetch(campaign))
      assert done.status == :completed
      assert done.completed_at
      assert Updates.progress(done) == %{outdated: 1, updated: 0, failed: 1}
    end

    test "it completes when nothing is outdated, and when it expires" do
      devbox = insert(:devbox, revision: 3)
      updated = insert(:devbox_instance, devbox: devbox, template_revision: "3", rebase_state: :succeeded)
      campaign = insert(:devbox_update_campaign, devbox: devbox, status: :running)
      updated |> DevboxInstance.changeset(%{update_campaign_id: campaign.id}) |> Repo.update!()

      {:ok, done} = Updates.advance(campaign)
      assert done.status == :completed
      assert Updates.progress(done) == %{outdated: 0, updated: 1, failed: 0}

      other = insert(:devbox, revision: 3)
      busy = insert(:devbox_instance,
        devbox: other,
        template_revision: "2",
        idle_state: %{idle: false},
        update_deadline_at: DateTime.utc_now()
      )
      expired = insert(:devbox_update_campaign, devbox: other, status: :running, expires_at: Timex.shift(DateTime.utc_now(), minutes: -1))
      busy |> DevboxInstance.changeset(%{update_campaign_id: expired.id}) |> Repo.update!()

      {:ok, %{status: :completed}} = Updates.advance(expired)
      refute refetch(busy).update_deadline_at
    end
  end

  describe "#run/0" do
    test "it advances campaigns that have started" do
      devbox = insert(:devbox, revision: 3)
      inst = insert(:devbox_instance, devbox: devbox, template_revision: "2", status: :suspended)
      insert(:devbox_update_campaign, devbox: devbox)
      later = insert(:devbox, revision: 3)
      waiting = insert(:devbox_instance, devbox: later, template_revision: "2", status: :suspended)
      insert(:devbox_update_campaign, devbox: later, starts_at: Timex.shift(DateTime.utc_now(), hours: 1))
      expect(Control.Test, :rebase_instance, fn _, _ -> {:ok, %{accepted: true}} end)

      :ok = Updates.run()

      assert refetch(inst).rebase_state == :in_progress
      refute refetch(waiting).rebase_state
    end
  end

  defp outdated_instance(attrs \\ []) do
    user = insert(:user)
    wb = insert(:workbench, read_bindings: [%{user_id: user.id}])
    insert(:devbox_instance, Keyword.merge([template_revision: "2", devbox: insert(:devbox, revision: 3), user: user, workbench: wb], attrs))
  end
end
