defmodule Console.PubSub.Recurse.BuildsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.PubSub.Consumers.Recurse

  describe "BuildDeleted" do
    test "it will cancel build" do
      build = insert(:build)
      expect(Console.Deployer, :cancel, fn -> :ok end)

      event = %PubSub.BuildDeleted{item: build}
      Recurse.handle_event(event)
    end
  end

  describe "BuildCancelled" do
    test "it will cancel build" do
      build = insert(:build)
      expect(Console.Deployer, :cancel, fn -> :ok end)

      event = %PubSub.BuildCancelled{item: build}
      Recurse.handle_event(event)
    end
  end

  describe "BuildApproved" do
    test "it will cancel build" do
      build = insert(:build)
      parent = self()
      pid = spawn(fn ->
        receive do
          msg -> send parent, msg
        end
      end)
      Swarm.register_name(:test, pid)
      Console.Runner.register(pid)

      event = %PubSub.BuildApproved{item: build}
      Recurse.handle_event(event)

      assert_receive :kick
    end
  end

  describe "BuildFailed" do
    test "it will complete pending commands" do
      build = insert(:build)

      commands = insert_list(2, :command, build: build)
      %{id: ignore} = insert(:command, build: build, completed_at: Timex.now())

      event = %PubSub.BuildFailed{item: build}
      Recurse.handle_event(event)

      for %{id: id} = command <- commands do
        assert_receive {:event, %PubSub.CommandCompleted{item: %{id: ^id}}}
        assert refetch(command).completed_at
      end

      refute_receive {:event, %PubSub.CommandCompleted{item: %{id: ^ignore}}}
    end
  end
end
