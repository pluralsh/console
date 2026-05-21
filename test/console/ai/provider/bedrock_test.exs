defmodule Console.AI.Provider.BedrockTest do
  @moduledoc false
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Bedrock
  alias Console.Schema.DeploymentSettings.OauthToken

  @token_url "https://example.com/oauth2/token"
  @client_id "test-client-id"
  @client_secret "test-client-secret"
  @custom_base_url "https://custom-bedrock.example.com"
  @region "us-east-1"
  @model "global.anthropic.claude-haiku-4-5-20251001-v1:0"

  setup do
    prev = Application.get_env(:oauth2, :adapter)
    Application.put_env(:oauth2, :adapter, Tesla.Mock)

    on_exit(fn ->
      if prev do
        Application.put_env(:oauth2, :adapter, prev)
      else
        Application.delete_env(:oauth2, :adapter)
      end
    end)

    :ok
  end

  describe "token exchange" do
    setup :set_mimic_global

    test "completion exchanges OAuth token, passes base_url in provider opts, and sends Bearer auth via Req" do
      oauth_access_token = "oauth-access-token-for-bedrock"
      expected_invoke_url =
        "https://bedrock-runtime.#{@region}.amazonaws.com/model/#{@model}/invoke"

      stub(Console.Cache, :get, fn _ -> nil end)

      Tesla.Mock.mock(fn env ->
        assert env.method == :post
        assert env.url == @token_url
        assert URI.decode_query(env.body) == %{"grant_type" => "client_credentials"}

        assert header(env.headers, "authorization") ==
                 "Basic " <> Base.encode64(@client_id <> ":" <> @client_secret)

        %Tesla.Env{
          status: 200,
          headers: [{"content-type", "application/json"}],
          body:
            Jason.encode!(%{
              "access_token" => oauth_access_token,
              "token_type" => "Bearer",
              "expires_in" => 3600
            })
        }
      end)

      expect(Console.Cache, :put, fn key, %OAuth2.AccessToken{access_token: ^oauth_access_token}, _opts ->
        assert key == {:token_exchange, @token_url, @client_id, @client_secret}
        :ok
      end)

      bedrock =
        Bedrock.new(%{
          access_token: nil,
          aws_access_key_id: nil,
          aws_secret_access_key: nil,
          embedding_model: nil,
          region: @region,
          base_url: @custom_base_url,
          model_id: @model,
          tool_model_id: nil,
          enable_stream: false,
          token_exchange: %OauthToken{
            enabled: true,
            token_url: @token_url,
            client_id: @client_id,
            client_secret: @client_secret
          }
        })

      assert {:ok, provider_opts} = Bedrock.provider_options(bedrock)
      assert Keyword.get(provider_opts, :api_key) == oauth_access_token
      assert Keyword.get(provider_opts, :base_url) == @custom_base_url

      expect(Req, :request, fn %Req.Request{} = request ->
        url = request.url |> URI.to_string()

        assert url == expected_invoke_url

        assert request_header(request, "authorization") in [
                 "Bearer #{oauth_access_token}",
                 ["Bearer #{oauth_access_token}"]
               ]

        raw_body = %{
          "id" => "msg_bedrock_e2e",
          "type" => "message",
          "role" => "assistant",
          "model" => @model,
          "content" => [%{"type" => "text", "text" => "ok"}],
          "stop_reason" => "end_turn",
          "usage" => %{"input_tokens" => 10, "output_tokens" => 5}
        }

        {:ok, decoded} =
          ReqLLM.Providers.AmazonBedrock.Anthropic.parse_response(raw_body, %{
            model: @model,
            context: request.options[:context]
          })

        {:ok,
         %Req.Response{
           status: 200,
           headers: %{"content-type" => ["application/json"]},
           body: decoded
         }}
      end)

      assert {:ok, "ok"} = Bedrock.completion(bedrock, [{:user, "ping"}], [])
    end
  end

  defp header(headers, wanted) do
    wanted = String.downcase(wanted)

    Enum.find_value(headers, fn {k, v} ->
      if String.downcase(to_string(k)) == wanted, do: v
    end)
  end

  defp request_header(%Req.Request{headers: headers}, wanted) do
    wanted = String.downcase(wanted)

    Enum.find_value(headers, fn {k, v} ->
      if String.downcase(to_string(k)) == wanted, do: v
    end)
  end
end
