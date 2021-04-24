defmodule Console.DeployerTest do
  use Console.DataCase, async: false
  alias Console.Commands.Plural
  alias Console.Storage.Git
  use Mimic

  setup :set_mimic_global

  describe "#wake/0" do
    @tag :skip
    test "It will dequeue and deploy a repo" do
      myself = self()
      echo = fn msg ->
        send myself, msg
        {:ok, msg}
      end

      expect(Git, :init, fn -> echo.(:git_init) end)
      |> expect(:revise, & echo.({:commit, &1}))
      |> expect(:push, fn -> echo.(:git_push) end)
      |> expect(:revision, fn -> {:ok, "sha"} end)

      expect(Plural, :build, & echo.({:build, &1}))
      |> expect(:diff, & echo.({:diff, &1}))
      |> expect(:deploy, & echo.({:deploy, &1}))

      repo = "plural"
      build = insert(:build, repository: repo)
      :ok = Console.Deployer.wake()

      assert_receive :git_init
      assert_receive {:build, ^repo}
      assert_receive {:diff, ^repo}
      assert_receive {:deploy, ^repo}
      assert_receive :git_push

      assert_receive {:commit, msg}
      :timer.sleep(100)
      assert msg =~ repo

      refetched = refetch(build)
      assert refetched.status == :successful
      assert refetched.completed_at
      assert refetched.sha == "sha"

      state = Console.Deployer.state()
      refute state.pid
      refute state.ref
    end

    test "It can handle bounce deploys" do
      bounce = insert(:build, type: :bounce)
      myself = self()
      echo = fn msg ->
        send myself, msg
        {:ok, msg}
      end

      expect(Git, :init, fn -> echo.(:git_init) end)
      |> expect(:revision, fn -> {:ok, "sha"} end)
      expect(Plural, :bounce, fn repo -> echo.({:bounce, repo}) end)

      :ok = Console.Deployer.wake()

      assert_receive :git_init
      assert_receive {:bounce, repo}
      assert bounce.repository == repo
      :timer.sleep(100)

      assert refetch(bounce).status == :successful
    end
  end

  describe "update/2" do
    @tag :skip
    test "It can push an update to a values.yaml file" do
      expect(Git, :init, fn -> {:ok, :init} end)
      |> expect(:revise, fn _ -> {:ok, :commit} end)
      |> expect(:push, fn -> {:ok, :push} end)

      expect(File, :write, fn _, _ -> :ok end)

      {:ok, "content"} = Console.Deployer.update("repo", "content", :helm)
    end
  end
end
