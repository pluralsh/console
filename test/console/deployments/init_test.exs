defmodule Console.Deployments.InitTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Deployments.{Init, Git, Global}

  describe "#setup/0" do
    test "it will setup some initial resources" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      expect(Kube.Utils, :get_secret, fn _, _ -> {:error, "not found"} end)
      expect(Kube.Utils, :create_secret, fn "console", "console-auth-token", data -> {:ok, data} end)
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
      expect(Kube.Utils, :get_secret, fn _, _ -> {:error, "not found"} end)
      expect(Kube.Utils, :create_secret, fn "console", "console-auth-token", data -> {:ok, data} end)
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
      refute res.settings.ai
    end

    test "it will set up ollama when cloud" do
      expect(Console, :byok?, fn -> true end)
      expect(Console, :cloud?, 5, fn -> true end)
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

      assert res.settings.ai.enabled
      assert res.settings.ai.provider == :openai
      assert res.settings.ai.openai.base_url == "http://ai-proxy.ai-proxy:8000/openai/v1"
    end

    test "it will set up elasticsearch bindings when cloud and specified" do
      expect(Console, :byok?, fn -> true end)
      expect(Console, :cloud?, 5, fn -> true end)
      expect(Console, :cloud_instance, 2, fn -> "test" end)
      expect(Console, :es_creds, 2, fn -> {:ok, "http://test.es.com", "test"} end)
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

      assert res.settings.ai.enabled
      assert res.settings.ai.provider == :openai
      assert res.settings.ai.openai.base_url == "http://ai-proxy.ai-proxy:8000/openai/v1"

      global = Global.get_by_name!("logstash") |> Repo.preload([:template])

      assert global.name == "logstash"
      assert global.template.name == "logstash"
      assert global.template.namespace == "elastic"
      assert global.template.repository_id == res.artifacts_repo.id
      assert global.template.git.ref == "main"
      assert global.template.git.folder == "cloud/logstash"

      attrs = Console.Schema.ServiceTemplate.attributes(global.template)

      secrets = Map.new(attrs.configuration, & {&1.name, &1.value})
      assert secrets["username"] == "plrl-test"
      assert secrets["password"] == "test"
      assert secrets["esUrl"] == "http://test.es.com"
    end
  end

  describe "#setup_groups/0" do
    test "it will setup the sre group" do
      user = insert(:user)

      {:ok, member} = Init.setup_groups(user.email)

      member = Console.Repo.preload(member, [:user, :group])

      assert member.user_id == user.id
      assert member.group.name == "sre"
    end
  end
end
