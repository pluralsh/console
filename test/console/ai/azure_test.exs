defmodule Console.AI.AzureTest do
  use Console.DataCase, async: true
  use Mimic

  alias Console.AI.Azure

  describe "deployment routing" do
    test "it uses mapped deployment for proxy" do
      azure =
        Azure.new(%{
          access_token: "token",
          api_version: nil,
          endpoint: "https://test.openai.azure.com/openai/deployments",
          model: "gpt-4.1-mini",
          tool_model: nil,
          embedding_model: nil,
          deployments: %{"gpt-4.1-mini" => "chat-deployment"}
        })

      assert {:ok, %{url: "https://test.openai.azure.com/openai/deployments/chat-deployment"}} =
               Azure.proxy(azure)
    end

    test "it uses tool model deployment when configured" do
      azure =
        Azure.new(%{
          access_token: "token",
          api_version: nil,
          endpoint: "https://test.openai.azure.com/openai/deployments",
          model: "gpt-4.1-mini",
          tool_model: "o3-mini",
          embedding_model: nil,
          deployments: %{
            "gpt-4.1-mini" => "chat-deployment",
            "o3-mini" => "tool-deployment"
          }
        })

      expect(Console.AI.OpenAI, :new, fn opts ->
        send(self(), {:base_url, opts.base_url})
        opts
      end)

      expect(Console.AI.OpenAI, :tool_call, fn _, _, _, _ -> {:ok, "ok"} end)

      assert {:ok, "ok"} = Azure.tool_call(azure, [{:user, "test"}], [], [])

      assert_receive {:base_url,
                      "https://test.openai.azure.com/openai/deployments/tool-deployment"}
    end

    test "it uses embedding model deployment when configured" do
      azure =
        Azure.new(%{
          access_token: "token",
          api_version: nil,
          endpoint: "https://test.openai.azure.com/openai/deployments",
          model: nil,
          tool_model: nil,
          embedding_model: "text-embedding-3-large",
          deployments: %{"text-embedding-3-large" => "embedding-deployment"}
        })

      expect(Console.AI.OpenAI, :new, fn opts ->
        send(self(), {:base_url, opts.base_url})
        opts
      end)

      expect(Console.AI.OpenAI, :embeddings, fn _, _ -> {:ok, []} end)

      assert {:ok, []} = Azure.embeddings(azure, "test")

      assert_receive {:base_url,
                      "https://test.openai.azure.com/openai/deployments/embedding-deployment"}
    end
  end
end
