defmodule Console.Cron.JobsTest do
  use Console.DataCase, async: true
  alias Console.Cron.Jobs

  describe "#prune_builds/0" do
    test "It will delete expired builds" do
      keep = insert_list(2, :build)
      expire = insert_list(2, :build, inserted_at: Timex.now() |> Timex.shift(days: -100))

      {_, _} = Jobs.prune_builds()

      for b <- keep,
        do: assert refetch(b)

      for b <- expire,
        do: refute refetch(b)
    end
  end

  describe "#prune_audits/0" do
    test "it will prune the expired audit logs" do
      keep = insert_list(2, :audit)
      expire = insert_list(2, :audit, inserted_at: Timex.now() |> Timex.shift(days: -100))

      {_, _} = Jobs.prune_audits()

      for b <- keep,
        do: assert refetch(b)

      for b <- expire,
        do: refute refetch(b)
    end
  end

  describe "#prune_invites/0" do
    test "It will delete expired invites" do
      keep = insert_list(2, :invite)
      expire = insert_list(2, :invite, inserted_at: Timex.now() |> Timex.shift(days: -8))

      {_, _} = Jobs.prune_invites()

      for invite <- keep,
        do: assert refetch(invite)

      for invite <- expire,
        do: refute refetch(invite)
    end
  end

  describe "#prune_notifications/0" do
    test "it will delete old notifications" do
      keep = insert_list(3, :notification)
      expire = insert_list(3, :notification, inserted_at: Timex.now() |> Timex.shift(days: -40))

      {_, _} = Jobs.prune_notifications()

      for notif <- keep,
        do: assert refetch(notif)

      for notif <- expire,
        do: refute refetch(notif)
    end
  end

  describe "#prune_refresh_tokens/0" do
    test "it will delete old refresh_tokens" do
      keep = insert_list(3, :refresh_token)
      expire = insert_list(3, :refresh_token, inserted_at: Timex.now() |> Timex.shift(days: -8))

      {_, _} = Jobs.prune_refresh_tokens()

      for notif <- keep,
        do: assert refetch(notif)

      for notif <- expire,
        do: refute refetch(notif)
    end
  end

  describe "#fail_builds/0" do
    test "old running builds will be auto-failed" do
      old = insert(:build, status: :running, pinged_at: Timex.now() |> Timex.shift(hours: -1))
      new = insert(:build, status: :running, pinged_at: Timex.now())

      Jobs.fail_builds()

      assert refetch(old).status == :failed
      refute refetch(new).status == :failed

      assert_receive {:event, %Console.PubSub.BuildFailed{item: build}}

      assert build.id == old.id
    end
  end
end
