defmodule Console.Deployments.InitTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Deployments.{Init, Git, Services}

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
      expect(Console, :vmetrics_creds, 2, fn -> {:ok, "http://vmetrics.vmetrics.com", "test"} end)
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

      assert res.settings.prometheus_connection.host == "http://vmetrics.vmetrics.com/select/test/prometheus"
      assert res.settings.prometheus_connection.user == "plrl-test"
      assert res.settings.prometheus_connection.password == "test"

      assert res.settings.logging.enabled
      assert res.settings.logging.driver == :elastic
      assert res.settings.logging.elastic.host == "http://test.es.com"
      assert res.settings.logging.elastic.user == "plrl-test"
      assert res.settings.logging.elastic.password == "test"
      assert res.settings.logging.elastic.index == "plrl-test-logs-*"

      assert res.settings.ai.enabled
      assert res.settings.ai.provider == :openai
      assert res.settings.ai.openai.base_url == "http://ai-proxy.ai-proxy:8000/openai/v1"

      context = Services.get_context_by_name!("plrl/cloud/observability")
      assert context.configuration["elastic"]["url"] == "http://test.es.com"
      assert context.configuration["elastic"]["user"] == "plrl-test"
      assert context.configuration["elastic"]["password"] == "test"
      assert context.configuration["vmetrics"]["url"] == "http://vmetrics.vmetrics.com/insert/test/prometheus/api/v1/write"
      assert context.configuration["vmetrics"]["user"] == "plrl-test"
      assert context.configuration["vmetrics"]["password"] == "test"
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
