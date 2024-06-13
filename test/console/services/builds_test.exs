defmodule Console.Services.BuildsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Services.Builds
  alias Console.Plural.Context
  alias Console.{PubSub, Storage.Git}

  describe "Command implements Collectable" do
    @tag :skip
    test "A command can accumulate a string stream" do
      command = insert(:command)

      command = ["some", "string", "stream\n"] |> Enum.into(command)

      assert command.stdout == "somestringstream\n"
      assert refetch(command).stdout == "somestringstream\n"
    end
  end

  describe "#poll/0" do
    test "it will find the earliest queued build" do
      build = insert(:build, status: :queued, inserted_at: Timex.now() |> Timex.shift(days: -1))
      insert(:build, status: :queued)
      insert(:build, status: :successful, inserted_at: Timex.now() |> Timex.shift(days: -5))

      deployer = Ecto.UUID.generate()
      {:ok, found} = Builds.poll(deployer)

      assert found.id == build.id
      assert found.deployer == deployer
    end

    test "if there's a running build, it won't return" do
      insert(:build, status: :queued, inserted_at: Timex.now() |> Timex.shift(days: -1))
      insert(:build, status: :queued)
      insert(:build, status: :successful, inserted_at: Timex.now() |> Timex.shift(days: -5))
      insert(:build, status: :running)

      {:error, _} = Builds.poll(Ecto.UUID.generate())
    end
  end

  describe "#ping/1" do
    test "it can mark the pinged at on a build" do
      build = insert(:build)

      {:ok, pinged} = Builds.ping(build)

      assert pinged.pinged_at
    end
  end

  describe "#create_build/2" do
    test "It can create a build" do
      user = insert(:user)
      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{}} end)
      {:ok, build} = Builds.create(%{type: :deploy, repository: "repo"}, user)

      assert_receive {:event, %PubSub.BuildCreated{item: ^build}}
    end

    test "destroy builds fail when protected" do
      user = insert(:user)
      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{}} end)
      expect(Context, :get, fn -> {:ok, %Context{protect: ["repo"]}} end)
      {:error, _} = Builds.create(%{type: :destroy, repository: "repo"}, user)
    end
  end

  describe "#restart/2" do
    test "it can recreate a build" do
      build = insert(:build, status: :successful)
      user  = insert(:user, roles: %{admin: true})
      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{}} end)

      {:ok, restarted} = Builds.restart(build.id, user)

      assert restarted.status  == :queued
      assert restarted.type    == build.type
      assert restarted.message == build.message
      refute restarted.id      == build.id
      assert_receive {:event, %PubSub.BuildCreated{item: ^restarted}}
    end
  end

  describe "create_command/2" do
    test "It will create a command record for a build" do
      build = insert(:build)

      exec = "echo 'hello world'"
      {:ok, command} = Builds.create_command(%{command: exec}, build)

      assert command.command == exec
      assert command.build_id == build.id

      assert_receive {:event, %PubSub.CommandCreated{item: ^command}}
    end
  end

  describe "#cancel/2" do
    test "It will cancel a build by id and send an event" do
      user = insert(:user)
      build = insert(:build)

      {:ok, cancelled} = Builds.cancel(build.id, user)

      assert cancelled.status == :cancelled

      assert_receive {:event, %PubSub.BuildCancelled{item: ^cancelled, actor: ^user}}
    end

    test "if passed a build struct, it will cancel if in running state" do
      build = insert(:build, status: :running)

      {:ok, cancelled} = Builds.cancel(build)

      assert cancelled.status == :cancelled
    end

    test "if passed a struct, it will ignore if not running" do
      build = insert(:build, status: :successful)

      {:ok, cancelled} = Builds.cancel(build)

      assert cancelled.status == :successful
    end
  end

  describe "fail/1" do
    test "Failed builds broadcast" do
      build = insert(:build)

      {:ok, failed} = Builds.fail(build)

      assert failed.status == :failed
      assert_receive {:event, %PubSub.BuildFailed{item: ^failed}}
    end
  end

  describe "running/1" do
    test "it will mark a build as running and unlock the deployer" do
      dep_id = Ecto.UUID.generate()
      lock = insert(:lock, name: "deployer", holder: dep_id)
      build = insert(:build)

      {:ok, failed} = Builds.running(%{build | deployer: dep_id})

      assert failed.status == :running
      refute refetch(lock)
      assert_receive {:event, %PubSub.BuildUpdated{item: ^failed}}
    end
  end

  describe "succeed/1" do
    test "Succeded builds broadcast" do
      build = insert(:build)
      expect(Git, :revision, fn -> {:ok, "1234"} end)

      {:ok, succeed} = Builds.succeed(build)

      assert succeed.status == :successful
      assert succeed.sha == "1234"

      assert_receive {:event, %PubSub.BuildSucceeded{item: ^succeed}}

      %{changelogs: logs} = Console.Repo.preload(succeed, [:changelogs])
      by_name = Enum.into(logs, %{}, fn %{repo: r} = l -> {r, l} end)

      assert length(logs) == 2
      assert by_name["forge"].tool        == "helm"
      assert by_name["forge"].content     == "test"
      assert by_name["bootstrap"].tool    == "helm"
      assert by_name["bootstrap"].content == "test2"
    end
  end

  describe "complete" do
    test "Commands can be finalized" do
      command = insert(:command)

      {:ok, completed} = Builds.complete(%{command | stdout: "some output"}, 0)

      assert completed.exit_code == 0
      assert completed.completed_at
      assert completed.stdout == "some output"

      assert_receive {:event, %PubSub.CommandCompleted{item: ^completed}}
    end
  end

  describe "approve" do
    test "builds can be approved" do
      build = insert(:build, status: :pending)
      user  = insert(:user)

      {:ok, approved} = Builds.approve(build.id, user)

      assert approved.status == :running
      assert approved.approver_id == user.id

      assert_receive {:event, %PubSub.BuildApproved{item: ^approved}}
    end
  end

  describe "pending" do
    test "builds can be marked pending" do
      build = insert(:build, status: :running)

      {:ok, pending} = Builds.pending(build)

      assert pending.status == :pending

      %{changelogs: [_, _]} = Console.Repo.preload(pending, [:changelogs])
    end
  end

  describe "lock" do
    test "it can create a lock if none exists, then prevent further creation" do
      holder = Ecto.UUID.generate()
      {:ok, _} = Builds.lock("test", holder)
      {:error, :locked} = Builds.lock("test", Ecto.UUID.generate())
    end
  end

  describe "unlock" do
    test "a lock holder can unlock a lock" do
      holder = Ecto.UUID.generate()
      {:ok, lock} = Builds.lock("test", holder)
      {:ok, _} = Builds.unlock("test", holder)

      refute refetch(lock)
    end

    test "non lock holders cannot unlock a lock" do
      holder = Ecto.UUID.generate()
      {:ok, _} = Builds.lock("test", holder)
      {:error, :locked} = Builds.unlock("test", Ecto.UUID.generate())
    end
  end
end
