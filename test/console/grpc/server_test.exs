defmodule Console.GRPC.ServerTest do
  use Console.DataCase, async: true

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
end
