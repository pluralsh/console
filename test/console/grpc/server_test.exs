defmodule Console.GRPC.ServerTest do
  use Console.DataCase, async: true
  use Mimic

  alias Console.AI.Provider
  alias Console.GRPC.Server

  describe "get_ai_config/2" do
    test "uses a dummy OpenAI-compatible api key when no token is configured" do
      deployment_settings(
        ai: %{
          enabled: true,
          openai_compatible: %{
            base_url: "https://openai-compatible.example.com",
            model: "custom-model"
          }
        }
      )

      config = Server.get_ai_config(%Plrl.AiConfigRequest{}, nil)

      assert config.enabled
      assert config.openaiCompatible.apiKey == "ignore"
      assert config.openaiCompatible.baseUrl == "https://openai-compatible.example.com"
      assert config.openaiCompatible.model == "custom-model"
    end

    test "uses default OpenAI proxy models when none are configured" do
      deployment_settings(
        ai: %{
          enabled: true,
          openai: %{access_token: "openai-token"}
        }
      )

      config = Server.get_ai_config(%Plrl.AiConfigRequest{}, nil)

      assert config.openai.proxyModels == Provider.defaults(:openai)[:proxy_models]
    end

    test "forwards provider-scoped HTTP proxy configuration to Nexus" do
      deployment_settings(
        ai: %{
          enabled: true,
          openai: %{
            access_token: "openai-token",
            proxy: %{
              url: "http://proxy.example.com:8080",
              noproxy: "models.internal"
            }
          },
          anthropic: %{
            access_token: "anthropic-token",
            proxy: %{
              enabled: false,
              url: "http://disabled-proxy.example.com:8080"
            }
          }
        }
      )

      config = Server.get_ai_config(%Plrl.AiConfigRequest{}, nil)

      assert config.openai.proxy.url == "http://proxy.example.com:8080"
      assert config.openai.proxy.noProxy == "models.internal"
      assert config.openai.proxy.enabled
      refute config.anthropic.proxy.enabled
      assert config.anthropic.proxy.url == "http://disabled-proxy.example.com:8080"
    end

    test "preserves configured OpenAI-compatible api keys" do
      deployment_settings(
        ai: %{
          enabled: true,
          openai_compatible: %{
            access_token: "configured-token",
            base_url: "https://openai-compatible.example.com"
          }
        }
      )

      config = Server.get_ai_config(%Plrl.AiConfigRequest{}, nil)

      assert config.openaiCompatible.apiKey == "configured-token"
    end

    test "forwards configured Bedrock bearer tokens" do
      model_id = "anthropic.claude-sonnet-4-6"
      inference_profile_arn =
        "arn:aws:bedrock:us-east-2:123456789012:inference-profile/us.openai.gpt-5.6-luna"

      deployment_settings(
        ai: %{
          enabled: true,
          bedrock: %{
            access_token: "bedrock-token",
            endpoint: :mantle,
            model_settings: [
              %{model_id: model_id, inference_profile_arn: inference_profile_arn}
            ]
          }
        }
      )

      config = Server.get_ai_config(%Plrl.AiConfigRequest{}, nil)

      assert config.bedrock.accessToken == "bedrock-token"
      assert config.bedrock.endpoint == :MANTLE
      assert config.bedrock.modelSettings == [
               %Plrl.BedrockModelSettings{
                 modelId: model_id,
                 inferenceProfileArn: inference_profile_arn
               }
             ]
    end

    test "returns xAI configuration" do
      deployment_settings(
        ai: %{
          enabled: true,
          xai: %{
            access_token: "xai-token",
            base_url: "https://api.x.ai/v1",
            model: "grok-4.5"
          }
        }
      )

      config = Server.get_ai_config(%Plrl.AiConfigRequest{}, nil)

      assert config.enabled
      assert config.xai.apiKey == "xai-token"
      assert config.xai.baseUrl == "https://api.x.ai/v1"
      assert config.xai.model == "grok-4.5"
      assert config.xai.toolModel == "grok-4.5"
    end
  end

  describe "verify_cluster/2" do
    test "returns the KAS cluster identity for a cluster access token" do
      cluster = insert(:cluster)

      result = Server.verify_cluster(%Plrl.VerifyClusterRequest{token: cluster.deploy_token}, nil)

      assert result.id == cluster.id
      assert result.name == cluster.name
    end

    test "requires a valid cluster access token" do
      error =
        assert_raise GRPC.RPCError, fn ->
          Server.verify_cluster(%Plrl.VerifyClusterRequest{token: "console-not-a-cluster-token"}, nil)
        end

      assert error.status == GRPC.Status.unauthenticated()
    end
  end

  describe "get_observability_config/2" do
    test "it uses elastic and victoria metrics for legacy cloud o11y" do
      stub_o11y_conf(false)

      config = Server.get_observability_config(%Plrl.ObservabilityConfigRequest{}, nil)

      assert config.elasticHost == "http://test.es.com"
      assert config.elasticUsername == "plrl-test"
      assert config.prometheusHost == "http://vmetrics.example.com/select/tenant/prometheus"
      refute config.lokiHost
    end

    test "it omits elastic config when plural telemetry is enabled" do
      stub_o11y_conf(true)

      config = Server.get_observability_config(%Plrl.ObservabilityConfigRequest{}, nil)

      refute config.elasticHost
      refute config.elasticPassword
      assert config.lokiHost == "https://telemetry.example.com/logs/write/ns/test"
      assert config.prometheusHost == "https://telemetry.example.com/metrics/read/ns/test"
      assert config.prometheusUsername == "plrl"
    end
  end

  defp stub_o11y_conf(plural) do
    stub(Console, :conf, fn
      :cloud_instance -> "test"
      :plural_o11y -> plural
      :telemetry_url -> "https://telemetry.example.com"
      :es_url -> "http://test.es.com"
      :es_password -> "secret"
      :vmetrics_url -> "http://vmetrics.example.com"
      :vmetrics_tenant -> "tenant"
      key -> Application.get_env(:console, key, nil)
    end)
  end
end
