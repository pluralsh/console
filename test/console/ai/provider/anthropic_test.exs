defmodule Console.AI.Provider.AnthropicTest do
  use ExUnit.Case, async: true

  alias Console.AI.Anthropic

  describe "provider_options/1" do
    test "passes a custom base url through to ReqLLM" do
      anthropic = Anthropic.new(%{access_token: "key", model: nil, tool_model: nil, base_url: "https://gateway.example.com"})

      assert Anthropic.provider_options(anthropic)[:base_url] == "https://gateway.example.com"
    end

    test "strips a trailing /v1 since ReqLLM appends /v1/messages" do
      anthropic = Anthropic.new(%{access_token: "key", model: nil, tool_model: nil, base_url: "https://gateway.example.com/v1/"})

      assert Anthropic.provider_options(anthropic)[:base_url] == "https://gateway.example.com"
    end

    test "omits blank base urls" do
      anthropic = Anthropic.new(%{access_token: "key", model: nil, tool_model: nil, base_url: ""})

      refute Keyword.has_key?(Anthropic.provider_options(anthropic), :base_url)
    end
  end
end
