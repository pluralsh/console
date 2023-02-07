defmodule Console.Watchers.Handlers.UpgradeTest do
  use Console.DataCase, async: false
  alias Console.Watchers.Handlers.Upgrade
  use Mimic

  describe "#create_build/1" do
    test "it can create a build from an upgrade struct" do
      bot = insert(:user, bot_name: "console")
      Console.Cache.delete(:upgrade_policies)
      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{metadata: %{name: "plural"}}} end)

      {:ok, build} = Upgrade.create_build(%{"message" => "a message", "repository" => %{"name" => "plural"}})

      assert build.creator_id == bot.id
      assert build.repository == "plural"
      assert build.type == :deploy
    end

    test "it will respect passed upgrade type" do
      bot = insert(:user, bot_name: "console")
      Console.Cache.delete(:upgrade_policies)
      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{metadata: %{name: "plural"}}} end)

      {:ok, build} = Upgrade.create_build(%{
        "message" => "a message",
        "repository" => %{"name" => "plural"},
        "type" => "bounce"
      })

      assert build.creator_id == bot.id
      assert build.repository == "plural"
      assert build.type == :bounce
    end

    test "it will respect passed dedicated upgrade type" do
      bot = insert(:user, bot_name: "console")
      Console.Cache.delete(:upgrade_policies)
      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{metadata: %{name: "plural"}}} end)

      {:ok, build} = Upgrade.create_build(%{
        "message" => "a message",
        "repository" => %{"name" => "plural"},
        "type" => "dedicated"
      })

      assert build.creator_id == bot.id
      assert build.repository == "plural"
      assert build.type == :dedicated
    end

    test "it can recognize upgrade policies" do
      bot = insert(:user, bot_name: "console")
      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{metadata: %{name: "plural"}}} end)
      insert(:upgrade_policy, target: "*", type: :approval)
      Console.Cache.delete(:upgrade_policies)
      {:ok, build} = Upgrade.create_build(%{"message" => "a message", "repository" => %{"name" => "plural"}})

      assert build.creator_id == bot.id
      assert build.repository == "plural"
      assert build.type == :approval
    end

    test "it will ignore if no application is present" do
      insert(:user, bot_name: "console")
      expect(Kazan, :run, fn _ -> {:error, :not_found} end)
      insert(:upgrade_policy, target: "*", type: :approval)
      Console.Cache.delete(:upgrade_policies)
      {:ok, :ignore} = Upgrade.create_build(%{"message" => "a message", "repository" => %{"name" => "plural"}})
    end

    test "it will not create on ignore policies" do
      insert(:user, bot_name: "console")
      insert(:upgrade_policy, target: "*", type: :ignore)
      Console.Cache.delete(:upgrade_policies)
      {:ok, :ignore} = Upgrade.create_build(%{"message" => "a message", "repository" => %{"name" => "plural"}})
    end
  end
end
