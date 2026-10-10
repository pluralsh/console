defmodule Console.Deployments.InitTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Deployments.{Init, Git, Services, Settings}
  alias Console.Schema.DeploymentSettings

  describe "#migrate_bedrock/0" do
    @legacy_proxy_ai %{
      enabled: true,
      provider: :openai,
      openai: %{base_url: "http://ai-proxy.ai-proxy:8000/openai/v1"}
    }

    test "updates global settings from legacy ai-proxy OpenAI to Bedrock when cloud and AWS" do
      insert(:deployment_settings, ai: @legacy_proxy_ai)

      stub(Console, :conf, fn
        :cloud -> true
        :provider -> :aws
      end)

      assert {:ok, %DeploymentSettings{}} = Init.migrate_bedrock()

      updated = Settings.fetch_consistent()
      assert updated.ai.provider == :bedrock
      assert updated.ai.bedrock
    end

    test "does not update settings when conf indicates not cloud" do
      insert(:deployment_settings, ai: @legacy_proxy_ai)

      stub(Console, :conf, fn
        :cloud -> false
        :provider -> :aws
      end)

      assert {:ok, %{}} = Init.migrate_bedrock()

      unchanged = Settings.fetch_consistent()
      assert unchanged.ai.provider == :openai
      assert unchanged.ai.openai.base_url == "http://ai-proxy.ai-proxy:8000/openai/v1"
    end

    test "does not update settings when conf provider is not AWS" do
      insert(:deployment_settings, ai: @legacy_proxy_ai)

      stub(Console, :conf, fn
        :cloud -> true
        :provider -> :azure
      end)

      assert {:ok, %{}} = Init.migrate_bedrock()

      unchanged = Settings.fetch_consistent()
      assert unchanged.ai.provider == :openai
      assert unchanged.ai.openai.base_url == "http://ai-proxy.ai-proxy:8000/openai/v1"
    end
  end

  describe "#migrate_openai/0" do
    @legacy_bedrock_ai %{
      enabled: true,
      provider: :bedrock,
      bedrock: %{region: "us-east-1"}
    }

    test "updates global settings from Bedrock to OpenAI when cloud and AWS" do
      insert(:deployment_settings, ai: @legacy_bedrock_ai)

      stub(Console, :conf, fn
        :cloud -> true
        :provider -> :aws
      end)

      assert {:ok, %DeploymentSettings{}} = Init.migrate_openai()

      updated = Settings.fetch_consistent()
      assert updated.ai.provider == :openai
      assert updated.ai.openai.base_url == "http://ai-proxy.ai-proxy:8000/openai/v1"
    end

    test "does not update settings when conf indicates not cloud" do
      insert(:deployment_settings, ai: @legacy_bedrock_ai)

      stub(Console, :conf, fn
        :cloud -> false
        :provider -> :aws
      end)

      assert {:ok, %{}} = Init.migrate_openai()

      unchanged = Settings.fetch_consistent()
      assert unchanged.ai.provider == :bedrock
      assert unchanged.ai.bedrock.region == "us-east-1"
    end

    test "does not update settings when conf provider is not AWS" do
      insert(:deployment_settings, ai: @legacy_bedrock_ai)

      stub(Console, :conf, fn
        :cloud -> true
        :provider -> :azure
      end)

      assert {:ok, %{}} = Init.migrate_openai()

      unchanged = Settings.fetch_consistent()
      assert unchanged.ai.provider == :bedrock
      assert unchanged.ai.bedrock.region == "us-east-1"
    end
  end

  describe "#force_flip/0" do
    test "routes to migrate_openai when cloud_override is openai" do
      insert(:deployment_settings, ai: %{enabled: true, provider: :bedrock, bedrock: %{region: "us-east-1"}})

      stub(Console, :conf, fn
        :cloud_override -> "openai"
        :cloud -> true
        :provider -> :aws
      end)

      assert {:ok, %DeploymentSettings{}} = Init.force_flip()

      updated = Settings.fetch_consistent()
      assert updated.ai.provider == :openai
      assert updated.ai.openai.base_url == "http://ai-proxy.ai-proxy:8000/openai/v1"
    end

    test "routes to migrate_bedrock when cloud_override is bedrock" do
      insert(:deployment_settings, ai: %{
        enabled: true,
        provider: :openai,
        openai: %{base_url: "http://ai-proxy.ai-proxy:8000/openai/v1"}
      })

      stub(Console, :conf, fn
        :cloud_override -> "bedrock"
        :cloud -> true
        :provider -> :aws
      end)

      assert {:ok, %DeploymentSettings{}} = Init.force_flip()

      updated = Settings.fetch_consistent()
      assert updated.ai.provider == :bedrock
      assert updated.ai.bedrock.region == "us-east-1"
    end

    test "returns ok without changes for unknown cloud_override" do
      insert(:deployment_settings, ai: %{enabled: true, provider: :bedrock, bedrock: %{region: "us-east-1"}})

      stub(Console, :conf, fn
        :cloud_override -> "noop"
      end)

      assert {:ok, %{}} = Init.force_flip()

      unchanged = Settings.fetch_consistent()
      assert unchanged.ai.provider == :bedrock
      assert unchanged.ai.bedrock.region == "us-east-1"
    end
  end

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

    test "it will bypass cluster limits" do
      expect(Console, :byok?, fn -> true end)
      insert(:user, bot_name: "console", roles: %{admin: true})
      expect(Kube.Utils, :get_secret, fn _, _ -> {:error, "not found"} end)
      expect(Kube.Utils, :create_secret, fn "console", "console-auth-token", data -> {:ok, data} end)
      reject(&Console.Features.cluster_max/0)
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

    test "it will set up openai provider when cloud" do
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
      assert context.configuration["vmetrics"]["url"] == "https://my.plural.console/ext/v1/ingest/prometheus"
      assert context.configuration["vmetrics"]["query_url"] == "https://my.plural.console/ext/v1/query/prometheus"
      assert context.configuration["vmetrics"]["user"] == "plrl-test"
      assert context.configuration["vmetrics"]["password"] == "test"
      assert context.configuration["elastic"]["url"] == "https://my.plural.console:443/ext/v1/ingest/elastic"
      assert context.configuration["elastic"]["user"] == "plrl-test"
      assert context.configuration["elastic"]["password"] == "test"
      assert context.configuration["elastic"]["index"] == "plrl-test-logs-write"
    end
  end

  describe "#setup_workbench/0" do
    test "creates elastic, prometheus, and exa workbench tools and plural workbench when cloud and creds are available" do
      expect(Console, :cloud?, fn -> true end)
      expect(Console, :cloud_instance, fn -> "test" end)
      expect(Console, :es_creds, fn -> {:ok, "http://test.es.com", "secret"} end)
      expect(Console, :vmetrics_creds, fn -> {:ok, "http://vmetrics.example.com", "vtenant"} end)
      stub(Console, :conf, fn
        :exa_api_key -> "test-exa-api-key"
        key -> Application.get_env(:console, key, nil)
      end)
      insert(:user, bot_name: "console", roles: %{admin: true})

      {:ok, %{es: es, prometheus: prometheus, exa: exa, bench: bench}} = Init.setup_workbench()

      assert es.name == "plrl_elastic_logs"
      assert es.tool == :elastic
      assert es.configuration.elastic.url == "http://test.es.com"
      assert es.configuration.elastic.username == "plrl-test"
      assert es.configuration.elastic.password == "secret"
      assert es.configuration.elastic.index == "plrl-test-logs-*"

      assert prometheus.name == "plrl_prometheus"
      assert prometheus.tool == :prometheus
      assert prometheus.configuration.prometheus.url == "http://vmetrics.example.com/select/vtenant/prometheus"
      assert prometheus.configuration.prometheus.username == "plrl-test"
      assert prometheus.configuration.prometheus.password == "secret"

      assert exa.name == "exa"
      assert exa.tool == :exa
      assert exa.configuration.exa.api_key == "test-exa-api-key"

      bench = Console.Repo.preload(bench, tool_associations: :tool)
      assert bench.name == "plural"
      assert Enum.any?(bench.tool_associations, &(&1.tool_id == exa.id))
    end
  end

  describe "plural telemetry" do
    alias Console.Schema.WorkbenchTool
    alias Console.Deployments.Workbenches

    setup do
      stub(Console, :conf, fn
        :cloud -> true
        :cloud_instance -> "test"
        :plural_o11y -> true
        :telemetry_url -> "https://telemetry.example.com"
        :es_url -> "http://test.es.com"
        :es_password -> "secret"
        key -> Application.get_env(:console, key, nil)
      end)
      :ok
    end

    test "setup/0 configures settings and the service context against telemetry" do
      expect(Console, :byok?, fn -> true end)
      insert(:user, bot_name: "console", roles: %{admin: true})

      {:ok, res} = Init.setup()

      assert res.settings.prometheus_connection.host == "https://telemetry.example.com/metrics/read/ns/test"
      assert res.settings.prometheus_connection.user == "plrl"
      assert res.settings.prometheus_connection.password == "secret"

      assert res.settings.logging.enabled
      assert res.settings.logging.driver == :loki
      assert res.settings.logging.loki.host == "https://telemetry.example.com/logs/read/ns/test"
      assert res.settings.logging.loki.user == "plrl"
      assert res.settings.logging.loki.password == "secret"

      assert res.settings.ai.vector_store.elastic.host == "http://test.es.com"

      context = Services.get_context_by_name!("plrl/cloud/observability")
      assert context.configuration["elastic"]["user"] == "plrl"
      assert context.configuration["vmetrics"]["user"] == "plrl"
      assert context.configuration["loki"]["url"] == "https://my.plural.console/ext/v1/ingest/loki/api/v1/push"
      assert context.configuration["loki"]["query_url"] == "https://telemetry.example.com/logs/read/ns/test"
      assert context.configuration["tempo"]["url"] == "https://telemetry.example.com/traces/write/ns/test"
      assert context.configuration["tempo"]["query_url"] == "https://telemetry.example.com/traces/read/ns/test"
      assert context.configuration["tempo"]["password"] == "secret"
    end

    test "setup_workbench/0 creates telemetry backed tools" do
      insert(:user, bot_name: "console", roles: %{admin: true})

      {:ok, res} = Init.setup_workbench()

      refute res[:es]
      assert res.prometheus.configuration.prometheus.url == "https://telemetry.example.com/metrics/read/ns/test"
      assert res.prometheus.configuration.prometheus.username == "plrl"
      assert res.loki.tool == :loki
      assert res.loki.configuration.loki.url == "https://telemetry.example.com/logs/read/ns/test"
      assert res.tempo.tool == :tempo
      assert res.tempo.configuration.tempo.url == "https://telemetry.example.com/traces/read/ns/test"
      assert res.tempo.configuration.tempo.password == "secret"
      assert res.bench.name == "plural"
    end

    test "migrate_plural_telemetry/0 repoints an elastic/vmetrics install at telemetry" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:deployment_settings,
        prometheus_connection: %DeploymentSettings.Connection{host: "http://vm/select/t/prometheus", user: "plrl-test"},
        logging: %DeploymentSettings.Logging{
          enabled: true,
          driver: :elastic,
          elastic: %DeploymentSettings.Elastic{host: "http://test.es.com", index: "plrl-test-logs-*"}
        }
      )
      insert(:service_context, name: "plrl/cloud/observability", configuration: %{"elastic" => %{"user" => "plrl-test"}})
      prom = insert(:workbench_tool,
        name: "plrl_prometheus",
        tool: :prometheus,
        configuration: %WorkbenchTool.Configuration{
          prometheus: %WorkbenchTool.Configuration.PrometheusConnection{url: "http://vm/select/t/prometheus"}
        }
      )

      {:ok, res} = Init.migrate_plural_telemetry()

      assert res.settings.prometheus_connection.host == "https://telemetry.example.com/metrics/read/ns/test"
      assert res.settings.prometheus_connection.user == "plrl"
      assert res.settings.logging.driver == :loki
      assert res.settings.logging.loki.host == "https://telemetry.example.com/logs/read/ns/test"

      context = Services.get_context_by_name!("plrl/cloud/observability")
      assert context.configuration["elastic"]["user"] == "plrl"
      assert context.configuration["loki"]["query_url"] == "https://telemetry.example.com/logs/read/ns/test"
      assert context.configuration["tempo"]["url"] == "https://telemetry.example.com/traces/write/ns/test"

      assert res.prometheus.id == prom.id
      assert res.prometheus.configuration.prometheus.url == "https://telemetry.example.com/metrics/read/ns/test"
      assert res.prometheus.configuration.prometheus.username == "plrl"
      assert res.prometheus.configuration.prometheus.password == "secret"

      loki = Workbenches.get_workbench_tool_by_name!("plrl_loki_logs")
      assert loki.tool == :loki
      assert loki.configuration.loki.url == "https://telemetry.example.com/logs/read/ns/test"

      tempo = Workbenches.get_workbench_tool_by_name!("plrl_tempo_traces")
      assert tempo.tool == :tempo
      assert tempo.configuration.tempo.username == "plrl"
    end

    test "migrate_plural_telemetry/0 errors without a telemetry url" do
      stub(Console, :conf, fn
        :cloud -> true
        :cloud_instance -> "test"
        :plural_o11y -> true
        :es_url -> "http://test.es.com"
        :es_password -> "secret"
        key -> Application.get_env(:console, key, nil)
      end)

      assert {:error, _} = Init.migrate_plural_telemetry()
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
