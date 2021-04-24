defmodule Console.Watchers.Handlers.UpgradeTest do
  use Console.DataCase, async: true
  alias Console.Watchers.Handlers.Upgrade
  use Mimic

  describe "#create_build/1" do
    test "it can create a build from an upgrade struct" do
      bot = insert(:user, bot_name: "console")
      expect(Console.Deployer, :wake, fn -> :ok end)
      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{metadata: %{name: "plural"}}} end)

      {:ok, build} = Upgrade.create_build(%{"message" => "a message", "repository" => %{"name" => "plural"}})

      assert build.creator_id == bot.id
      assert build.repository == "plural"
    end
  end
end
