defmodule Watchman.Services.BuildsTest do
  use Watchman.DataCase, async: true
  alias Watchman.Services.Builds
  alias Watchman.PubSub

  describe "Command implements Collectable" do
    test "A command can accumulate a string stream" do
      command = insert(:command)

      command = ["some", "string", "stream"] |> Enum.into(command)

      assert command.stdout == "somestringstream"
    end
  end

  describe "create_command/2" do
    test "It will create a command record for a build" do
      build = insert(:build)

      exec = "echo 'hello world'"
      {:ok, command} = Builds.create_command(%{command: exec}, build)

      assert command.command == exec
      assert command.build_id == build.id
    end
  end

  describe "#cancel/1" do
    test "It will cancel a build by id and send an event" do
      build = insert(:build)

      {:ok, cancelled} = Builds.cancel(build.id)

      assert cancelled.status == :cancelled

      assert_receive {:event, %PubSub.BuildDeleted{item: ^cancelled}}
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

  describe "succeed/1" do
    test "Succeded builds broadcast" do
      build = insert(:build)
      {:ok, succeed} = Builds.succeed(build)

      assert succeed.status == :successful
      assert_receive {:event, %PubSub.BuildSucceeded{item: ^succeed}}

      %{changelogs: [changelog]} = Watchman.Repo.preload(succeed, [:changelogs])

      assert changelog.repo    == "forge"
      assert changelog.tool    == "helm"
      assert changelog.content == "test"
    end
  end

  describe "complete" do
    test "Commands can be finalized" do
      command = insert(:command)

      {:ok, completed} = Builds.complete(%{command | stdout: "some output"}, 0)

      assert completed.exit_code == 0
      assert completed.completed_at
      assert completed.stdout == "some output"
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

      %{changelogs: [changelog]} = Watchman.Repo.preload(pending, [:changelogs])

      assert changelog.repo    == "forge"
      assert changelog.tool    == "helm"
      assert changelog.content == "test"
    end
  end
end