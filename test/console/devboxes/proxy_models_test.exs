defmodule Console.Devboxes.ProxyModelsTest do
  use Console.DataCase, async: false
  alias Console.Devboxes
  alias Console.Devboxes.ProxyModels
  alias Console.Schema.Devbox

  defp settings(ai) do
    deployment_settings(ai: Map.put(ai, :enabled, true))
    Console.Deployments.Settings.fetch_consistent()
  end

  describe "for_agent/2" do
    test "claude gets every provider's models, the primary provider's claude models first, and every tier alias resolved" do
      s = settings(%{
        provider: :bedrock,
        openai: %{access_token: "key", model: "gpt-5", proxy_models: ["gpt-5-mini"]},
        anthropic: %{access_token: "key", model: "claude-opus-4-1", tool_model: "claude-haiku-4-5", proxy_models: ["claude-sonnet-4-5"]},
        bedrock: %{region: "us-east-1", model_id: "us.anthropic.claude-sonnet-4-5-v1:0", tool_model_id: "us.anthropic.claude-sonnet-4-5-v1:0", proxy_models: ["us.anthropic.claude-sonnet-4-5-v1:0"]}
      })

      assert %{default_model: "bedrock/us.anthropic.claude-sonnet-4-5-v1:0", models: models, aliases: aliases} =
               ProxyModels.for_agent(:claude, s)

      assert Enum.take(models, 4) == [
               "bedrock/us.anthropic.claude-sonnet-4-5-v1:0",
               "anthropic/claude-opus-4-1",
               "anthropic/claude-haiku-4-5",
               "anthropic/claude-sonnet-4-5"
             ]
      assert "openai/gpt-5" in models
      assert "openai/gpt-5-mini" in models

      assert aliases == %{
               "opus" => "anthropic/claude-opus-4-1",
               "sonnet" => "bedrock/us.anthropic.claude-sonnet-4-5-v1:0",
               "haiku" => "anthropic/claude-haiku-4-5"
             }
    end

    test "missing claude tiers fall back to the nearest one served" do
      s = settings(%{
        provider: :anthropic,
        anthropic: %{access_token: "key", model: "claude-sonnet-4-5", tool_model: "claude-sonnet-4-5", proxy_models: ["claude-sonnet-4-5"]}
      })

      assert %{aliases: %{"opus" => "anthropic/claude-sonnet-4-5", "haiku" => "anthropic/claude-sonnet-4-5"}} =
               ProxyModels.for_agent("claude", s)
    end

    test "codex only gets openai-style providers and opencode gets everything" do
      s = settings(%{
        provider: :openai,
        openai: %{access_token: "key", model: "gpt-5", tool_model: "gpt-5", proxy_models: ["gpt-5"]},
        anthropic: %{access_token: "key", model: "claude-sonnet-4-5", tool_model: "claude-sonnet-4-5", proxy_models: ["claude-sonnet-4-5"]}
      })

      assert %{default_model: "openai/gpt-5", models: ["openai/gpt-5"], aliases: %{}} = ProxyModels.for_agent(:codex, s)
      assert %{models: ["openai/gpt-5", "anthropic/claude-sonnet-4-5"]} = ProxyModels.for_agent(:opencode, s)
      assert ProxyModels.for_agent(:gemini, s) == nil
    end

    test "nothing when ai is disabled" do
      deployment_settings(ai: %{enabled: false, openai: %{access_token: "key"}})
      assert ProxyModels.for_agent(:claude) == nil
    end
  end

  describe "narrow/3" do
    @proxy %{default_model: "anthropic/claude-sonnet-4-5", models: ["anthropic/claude-sonnet-4-5", "anthropic/claude-haiku-4-5"], aliases: %{}}

    test "claude offers the proxy models instead of its built-in aliases" do
      agent = %Devbox.Agent{type: :claude}
      assert ProxyModels.narrow(agent, ~w(default opus[1m] sonnet haiku), @proxy) == @proxy.models
    end

    test "claude honors an allowlist of proxy ids" do
      agent = %Devbox.Agent{type: :claude, allowed_models: ~w(anthropic/claude-haiku-4-5 openai/gpt-5)}
      assert ProxyModels.narrow(agent, ~w(default), @proxy) == ~w(anthropic/claude-haiku-4-5)
    end

    test "other agents keep probed ids the proxy serves, or everything if none match" do
      agent = %Devbox.Agent{type: :opencode, model_switchable: true}
      assert ProxyModels.narrow(agent, ~w(plural/anthropic/claude-haiku-4-5 plural/openai/gpt-5), @proxy) ==
               ~w(plural/anthropic/claude-haiku-4-5)
      assert ProxyModels.narrow(agent, ~w(gpt-5-codex), @proxy) == ~w(gpt-5-codex)
    end

    test "agents without model control offer the proxy models at boot" do
      agent = %Devbox.Agent{type: :pi, model_switchable: false}
      assert ProxyModels.narrow(agent, [], @proxy) == @proxy.models
    end

    test "no proxy leaves the catalog alone" do
      assert ProxyModels.narrow(%Devbox.Agent{type: :claude}, ~w(opus), nil) == ~w(opus)
    end
  end

  test "the claude picker lists the proxy models and preselects the proxy default" do
    settings(%{provider: :anthropic, anthropic: %{access_token: "key", model: "claude-sonnet-4-5", tool_model: "claude-sonnet-4-5", proxy_models: ["claude-sonnet-4-5"]}})
    agent = %Devbox.Agent{type: :claude, default_model: "opus", models: [%Devbox.Agent.Model{id: "opus"}, %Devbox.Agent.Model{id: "sonnet"}]}

    assert Devboxes.offered_models(agent) == ["anthropic/claude-sonnet-4-5"]
    assert Devboxes.default_model(agent) == "anthropic/claude-sonnet-4-5"
  end
end
