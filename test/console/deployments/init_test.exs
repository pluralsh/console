defmodule Console.Deployments.InitTest do
  use Console.DataCase, async: true
  alias Console.Deployments.{Init, Git}

  describe "#setup/0" do
    test "it will setup some initial resources" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      {:ok, res} = Init.setup()

      assert res.provider.name == "aws"
      assert res.provider.namespace == "bootstrap"

      assert res.deploy_repo.url == Git.deploy_url()
      assert res.artifacts_repo.url == Git.artifacts_url()

      assert res.cluster.name == Console.conf(:cluster_name)
      assert res.cluster.self

      assert res.settings.name == "global"
      assert res.settings.deployer_repository_id == res.deploy_repo.id
      assert res.settings.artifact_repository_id == res.artifacts_repo.id
    end
  end
end
