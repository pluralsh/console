defmodule Console.Deployments.InitTest do
  use Console.DataCase, async: true
  alias Console.Deployments.{Init, Git}

  describe "#setup/0" do
    test "it will setup some initial resources" do
      insert(:user, bot_name: "console")
      {:ok, res} = Init.setup()

      assert res.provider.name == "aws"
      assert res.provider.namespace == "bootstrap"

      assert res.deploy_repo.url == Git.deploy_url()
      assert res.artifacts_repo.url == Git.artifacts_url()

      assert res.cluster.name == Console.conf(:cluster_name)
      assert res.cluster.self
    end
  end
end
