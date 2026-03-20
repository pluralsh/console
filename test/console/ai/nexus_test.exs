defmodule Console.AI.NexusTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Nexus
  alias Console.AI.Provider
  alias Console.Deployments.Settings

  describe "new/1" do
    test "creates a client with default values" do
      client = Nexus.new()

      assert client.url == "http://localhost:8080/ext/ai"
      assert client.embedding_model == "text-embedding-3-large"
      assert client.token == nil
      assert client.model == nil
      assert client.tool_model == nil
    end

    test "creates a client with custom values" do
      client = Nexus.new(%{
        url: "http://custom:9090/proxy",
        access_token: "test-token",
        model: "gpt-4",
        tool_model: "gpt-4-turbo",
        embedding_model: "custom-model"
      })

      assert client.url == "http://custom:9090/proxy"
      assert client.token == "test-token"
      assert client.model == "gpt-4"
      assert client.tool_model == "gpt-4-turbo"
      assert client.embedding_model == "custom-model"
    end

    test "accepts token as alias for access_token" do
      client = Nexus.new(%{
        url: "http://custom:9090/proxy",
        token: "test-token"
      })

      assert client.token == "test-token"
    end
  end

  describe "embeddings/2" do
    @tag :skip
    test "successfully generates embeddings" do
      client = Nexus.new(%{
        url: "http://localhost:8080/ai/proxy",
        access_token: "test-token",
        embedding_model: "text-embedding-3-large"
      })

      embedding_response = %{
        "data" => [
          %{"embedding" => Enum.map(1..512, fn _ -> :rand.uniform() end), "index" => 0}
        ],
        "model" => "text-embedding-3-large"
      }

      expect(HTTPoison, :post, fn url, body, headers, _opts ->
        assert url == "http://localhost:8080/ai/proxy/v1/embeddings"
        assert {"Authorization", "Bearer test-token"} in headers
        assert {"Content-Type", "application/json"} in headers

        decoded_body = Jason.decode!(body)
        assert decoded_body["model"] == "text-embedding-3-large"
        assert decoded_body["dimensions"] == 512
        assert decoded_body["encoding_format"] == "float"
        assert is_binary(decoded_body["input"])

        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(embedding_response)}}
      end)

      {:ok, result} = Nexus.embeddings(client, "test text for embedding")

      assert is_list(result)
      assert length(result) == 1
      [{text, embedding}] = result
      assert is_binary(text)
      assert is_list(embedding)
      assert length(embedding) == 512
    end

    @tag :skip
    test "handles multiple chunks" do
      client = Nexus.new(%{
        url: "http://localhost:8080/ai/proxy",
        access_token: "test-token"
      })

      long_text = String.duplicate("a", 16000)

      embedding_response = %{
        "data" => [
          %{"embedding" => Enum.map(1..512, fn _ -> :rand.uniform() end), "index" => 0}
        ],
        "model" => "text-embedding-3-large"
      }

      expect(HTTPoison, :post, 2, fn _url, _body, _headers, _opts ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(embedding_response)}}
      end)

      {:ok, result} = Nexus.embeddings(client, long_text)

      assert is_list(result)
      assert length(result) == 2
    end

    @tag :skip
    test "handles API errors" do
      import ExUnit.CaptureLog

      client = Nexus.new(%{
        url: "http://localhost:8080/ai/proxy",
        access_token: "test-token"
      })

      expect(HTTPoison, :post, fn _url, _body, _headers, _opts ->
        {:ok, %HTTPoison.Response{
          status_code: 401,
          body: Jason.encode!(%{"error" => "Unauthorized"})
        }}
      end)

      {result, log} = with_log(fn ->
        Nexus.embeddings(client, "test text")
      end)

      assert {:error, msg} = result
      assert msg =~ "openai error"
      assert log =~ "openai error"
    end

    @tag :skip
    test "handles network errors" do
      client = Nexus.new(%{
        url: "http://localhost:8080/ai/proxy",
        access_token: "test-token"
      })

      expect(HTTPoison, :post, fn _url, _body, _headers, _opts ->
        {:error, %HTTPoison.Error{reason: :econnrefused}}
      end)

      {:error, msg} = Nexus.embeddings(client, "test text")

      assert msg =~ "openai network error"
    end

    @tag :skip
    test "works without auth token" do
      client = Nexus.new(%{
        url: "http://localhost:8080/ai/proxy",
        access_token: nil
      })

      embedding_response = %{
        "data" => [
          %{"embedding" => Enum.map(1..512, fn _ -> :rand.uniform() end), "index" => 0}
        ],
        "model" => "text-embedding-3-large"
      }

      expect(HTTPoison, :post, fn _url, _body, headers, _opts ->
        refute Enum.any?(headers, fn {k, _} -> k == "Authorization" end)
        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(embedding_response)}}
      end)

      {:ok, _result} = Nexus.embeddings(client, "test text")
    end
  end

  describe "Provider.embeddings/2 with nexus in settings" do
    setup do
      insert(:deployment_settings)
      :ok
    end

    @tag :skip
    test "routes through Nexus when configured in deployment settings" do
      embedding_response = %{
        "data" => [
          %{"embedding" => Enum.map(1..512, fn _ -> :rand.uniform() end), "index" => 0}
        ],
        "model" => "text-embedding-3-large"
      }

      {:ok, _} = Settings.update(%{
        ai: %{
          enabled: true,
          provider: :openai,
          nexus: %{
            url: "http://test-nexus:8080",
            access_token: "test-token"
          }
        }
      })

      expect(HTTPoison, :post, fn url, _body, headers, _opts ->
        assert url =~ "test-nexus"
        assert {"Authorization", "Bearer test-token"} in headers
        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(embedding_response)}}
      end)

      {:ok, result} = Provider.embeddings("test text")

      assert is_list(result)
      [{text, embedding}] = result
      assert text == "test text"
      assert is_list(embedding)
    end

    @tag :skip
    test "uses custom embedding model from settings" do
      embedding_response = %{
        "data" => [
          %{"embedding" => Enum.map(1..512, fn _ -> :rand.uniform() end), "index" => 0}
        ],
        "model" => "custom-model"
      }

      {:ok, _} = Settings.update(%{
        ai: %{
          enabled: true,
          provider: :openai,
          nexus: %{
            url: "http://test-nexus:8080",
            access_token: "test-token",
            embedding_model: "custom-model"
          }
        }
      })

      expect(HTTPoison, :post, fn _url, body, _headers, _opts ->
        decoded = Jason.decode!(body)
        assert decoded["model"] == "custom-model"
        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(embedding_response)}}
      end)

      {:ok, _result} = Provider.embeddings("test text")
    end
  end

  describe "Provider.completion/2 with nexus in settings" do
    setup do
      insert(:deployment_settings)
      :ok
    end

    @tag :skip
    test "routes through Nexus when configured in deployment settings" do
      completion_response = %{
        "id" => "chatcmpl-123",
        "object" => "chat.completion",
        "created" => 1677652288,
        "model" => "gpt-4",
        "choices" => [
          %{
            "index" => 0,
            "message" => %{
              "role" => "assistant",
              "content" => "Hello! How can I help you today?"
            },
            "finish_reason" => "stop"
          }
        ],
        "usage" => %{
          "prompt_tokens" => 9,
          "completion_tokens" => 12,
          "total_tokens" => 21
        }
      }

      {:ok, _} = Settings.update(%{
        ai: %{
          enabled: true,
          provider: :openai,
          nexus: %{
            url: "http://test-nexus:8080",
            access_token: "test-token",
            model: "gpt-4"
          }
        }
      })

      expect(HTTPoison, :post, fn url, _body, headers, _opts ->
        assert url =~ "test-nexus"
        assert url =~ "/v1/chat/completions"
        assert {"Authorization", "Bearer test-token"} in headers
        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(completion_response)}}
      end)

      {:ok, result} = Provider.completion([{:user, "Hello"}])

      assert is_binary(result)
      assert result =~ "Hello"
    end
  end

  describe "Provider.tool_call/3 with nexus in settings" do
    setup do
      insert(:deployment_settings)
      :ok
    end

    @tag :skip
    test "routes through Nexus when configured in deployment settings" do
      tool_response = %{
        "id" => "chatcmpl-123",
        "object" => "chat.completion",
        "created" => 1677652288,
        "model" => "gpt-4-turbo",
        "choices" => [
          %{
            "index" => 0,
            "message" => %{
              "role" => "assistant",
              "content" => nil,
              "tool_calls" => [
                %{
                  "id" => "call_abc123",
                  "type" => "function",
                  "function" => %{
                    "name" => "pr",
                    "arguments" => Jason.encode!(%{"url" => "https://github.com/org/repo/pull/1"})
                  }
                }
              ]
            },
            "finish_reason" => "tool_calls"
          }
        ],
        "usage" => %{
          "prompt_tokens" => 50,
          "completion_tokens" => 30,
          "total_tokens" => 80
        }
      }

      {:ok, _} = Settings.update(%{
        ai: %{
          enabled: true,
          provider: :openai,
          nexus: %{
            url: "http://test-nexus:8080",
            access_token: "test-token",
            model: "gpt-4",
            tool_model: "gpt-4-turbo"
          }
        }
      })

      expect(HTTPoison, :post, fn url, body, headers, _opts ->
        assert url =~ "test-nexus"
        assert url =~ "/v1/chat/completions"
        assert {"Authorization", "Bearer test-token"} in headers
        decoded = Jason.decode!(body)
        assert decoded["tools"] != nil
        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(tool_response)}}
      end)

      {:ok, result} = Provider.tool_call([{:user, "Create a PR"}], [Console.AI.Tools.Pr])

      assert is_list(result)
    end

    @tag :skip
    test "uses tool_model when specified" do
      tool_response = %{
        "id" => "chatcmpl-123",
        "object" => "chat.completion",
        "created" => 1677652288,
        "model" => "gpt-4-turbo",
        "choices" => [
          %{
            "index" => 0,
            "message" => %{
              "role" => "assistant",
              "content" => "I'll help you with that."
            },
            "finish_reason" => "stop"
          }
        ]
      }

      {:ok, _} = Settings.update(%{
        ai: %{
          enabled: true,
          provider: :openai,
          nexus: %{
            url: "http://test-nexus:8080",
            access_token: "test-token",
            model: "gpt-4",
            tool_model: "gpt-4-turbo"
          }
        }
      })

      expect(HTTPoison, :post, fn url, body, _headers, _opts ->
        assert url =~ "test-nexus"
        decoded = Jason.decode!(body)
        assert decoded["model"] == "gpt-4-turbo"
        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(tool_response)}}
      end)

      Provider.tool_call([{:user, "Help me"}], [Console.AI.Tools.Pr])
    end
  end

  describe "nil url handling" do
    @tag :skip
    test "embeddings returns error when url is nil" do
      client = Nexus.new(%{url: nil})
      {:error, msg} = Nexus.embeddings(client, "test")
      assert msg =~ "nexus url is not configured"
    end

    @tag :skip
    test "completion returns error when url is nil" do
      client = Nexus.new(%{url: nil})
      {:error, msg} = Nexus.completion(client, [{:user, "hello"}], [])
      assert msg =~ "nexus url is not configured"
    end

    @tag :skip
    test "tool_call returns error when url is nil" do
      client = Nexus.new(%{url: nil})
      {:error, msg} = Nexus.tool_call(client, [{:user, "hello"}], [], [])
      assert msg =~ "nexus url is not configured"
    end

    @tag :skip
    test "proxy returns error when url is nil" do
      client = Nexus.new(%{url: nil})
      {:error, msg} = Nexus.proxy(client)
      assert msg =~ "nexus url is not configured"
    end
  end

  describe "provider capabilities" do
    @tag :skip
    test "tools? returns true" do
      assert Nexus.tools?() == true
    end

    @tag :skip
    test "proxy returns ok when url is configured" do
      client = Nexus.new(%{url: "http://localhost:8080"})
      {:ok, proxy} = Nexus.proxy(client)
      assert proxy.backend == :openai
      assert proxy.url == "http://localhost:8080/v1"
    end
  end
end
