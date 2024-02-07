defmodule Console.Deployments.SettingsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Deployments.Settings

  describe "#enable/1" do
    test "it will call the install command" do
      user = admin_user()
      insert(:deployment_settings)
      %{deploy_token: token} = insert(:cluster, self: true)
      expect(Console.Commands.Plural, :install_cd, fn _, ^token -> {:ok, ""} end)

      {:ok, updated} = Settings.enable(user)

      assert updated.enabled
    end
  end

  describe "#update/2" do
    test "admins can update global settings" do
      admin = admin_user()
      user = insert(:user)
      insert(:deployment_settings)

      {:ok, updated} = Settings.update(%{write_bindings: [%{user_id: user.id}]}, admin)

      %{write_bindings: [binding]} = Repo.preload(updated, [:write_bindings])
      assert binding.user_id == user.id
    end

    test "non admins cannot update" do
      user = insert(:user)
      insert(:deployment_settings)

      {:error, _} = Settings.update(%{write_bindings: [%{user_id: user.id}]}, insert(:user))
    end
  end

  describe "#migrate_agents/0" do
    test "it will set agent deployment settings globally" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:deployment_settings)

      {:ok, update} = Settings.migrate_agents()

      assert update.agent_version

      [migration] = Console.Repo.all(Console.Schema.AgentMigration)
      assert migration.ref == update.agent_version
    end

    test "if the agent has already been migrated, it won't go again" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:deployment_settings, agent_version: Settings.agent_ref())

      {:ok, _} = Settings.migrate_agents()

      [] = Console.Repo.all(Console.Schema.AgentMigration)
    end

    test "it will ignore if managing agents is not set" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:deployment_settings, manage_agents: false)

      {:error, _} = Settings.migrate_agents()
    end
  end
end
