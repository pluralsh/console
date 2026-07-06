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
  end
end
