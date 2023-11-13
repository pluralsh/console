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
end
