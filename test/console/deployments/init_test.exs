defmodule Console.Deployments.InitTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Deployments.{Init, Git}

  describe "#setup/0" do
    test "it will setup some initial resources" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      {:ok, res} = Init.setup()

      assert res.provider.name == "aws"
      assert res.provider.namespace == "bootstrap"
      assert res.provider.self

      assert res.deploy_repo.url == Git.deploy_url()
      assert res.artifacts_repo.url == Git.artifacts_url()

      assert res.cluster.name == Console.conf(:cluster_name)
      assert res.cluster.self

      assert res.rebind.id == res.cluster.id
      assert res.rebind.provider_id == res.provider.id

      assert res.settings.name == "global"
      assert res.settings.deployer_repository_id == res.deploy_repo.id
      assert res.settings.artifact_repository_id == res.artifacts_repo.id
      assert res.settings.write_policy_id
      assert res.settings.read_policy_id
      assert res.settings.git_policy_id
      assert res.settings.create_policy_id
    end

    test "it can properly init when byok" do
      expect(Console, :byok?, fn -> true end)
      insert(:user, bot_name: "console", roles: %{admin: true})
      {:ok, res} = Init.setup()

      refute res.provider.id

      assert res.deploy_repo.url == Git.deploy_url()
      assert res.artifacts_repo.url == Git.artifacts_url()

      assert res.cluster.name == Console.conf(:cluster_name)
      assert res.cluster.self

      assert res.rebind.id == res.cluster.id
      refute res.rebind.provider_id

      assert res.settings.name == "global"
      assert res.settings.deployer_repository_id == res.deploy_repo.id
      assert res.settings.artifact_repository_id == res.artifacts_repo.id
      assert res.settings.write_policy_id
      assert res.settings.read_policy_id
      assert res.settings.git_policy_id
      assert res.settings.create_policy_id
    end
  end
end
