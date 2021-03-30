defmodule Watchman.Watchers.Handlers.UpgradeTest do
  use Watchman.DataCase, async: true
  alias Watchman.Watchers.Handlers.Upgrade
  use Mimic

  describe "#create_build/1" do
    test "it can create a build from an upgrade struct" do
      bot = insert(:user, bot_name: "watchman")
      expect(Watchman.Deployer, :wake, fn -> :ok end)
      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{metadata: %{name: "forge"}}} end)

      {:ok, build} = Upgrade.create_build(%{"message" => "a message", "repository" => %{"name" => "forge"}})

      assert build.creator_id == bot.id
      assert build.repository == "forge"
    end
  end
end
