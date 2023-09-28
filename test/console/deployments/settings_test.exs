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
end
