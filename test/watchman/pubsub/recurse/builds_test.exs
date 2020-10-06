defmodule Watchman.PubSub.Recurse.BuildsTest do
  use Watchman.DataCase, async: true
  use Mimic
  alias Watchman.PubSub
  alias Watchman.PubSub.Consumers.Recurse

  describe "BuildDeleted" do
    test "it will cancel build" do
      build = insert(:build)
      expect(Watchman.Deployer, :cancel, fn -> :ok end)

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
      Watchman.Runner.register(pid)

      event = %PubSub.BuildApproved{item: build}
      Recurse.handle_event(event)

      assert_receive :kick
    end
  end
end
