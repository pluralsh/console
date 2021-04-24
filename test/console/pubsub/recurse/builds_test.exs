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
end
