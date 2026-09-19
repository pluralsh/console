defmodule Console.AI.Provider.BedrockTest do
  use ExUnit.Case, async: false
  use Mimic

  alias Console.AI.{Bedrock, Tool}
  alias Console.Schema.DeploymentSettings.AI.Bedrock, as: BedrockSettings
  alias ReqLLM.{Message, Message.ContentPart, Response, ToolCall}

  @inference_profile_id "us.anthropic.claude-sonnet-4-6"
  @application_profile_arn "arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/abcdef123456"
  @encoded_application_profile_arn URI.encode(@application_profile_arn, &URI.char_unreserved?/1)
  @region "us-east-2"
  @usage %{input_tokens: 10, output_tokens: 5, total_tokens: 15}

  setup :set_mimic_global

  describe "provider_options/1" do
    test "uses the runtime endpoint by default" do
      bedrock =
        Bedrock.new(%BedrockSettings{
          region: @region,
          aws_access_key_id: "test-access-key",
          aws_secret_access_key: "test-secret-key"
        })

      assert Bedrock.provider_options(bedrock)[:endpoint] == :runtime
    end

    test "passes the configured Mantle endpoint to ReqLLM" do
      bedrock =
        Bedrock.new(%BedrockSettings{
          region: @region,
          endpoint: :mantle,
          aws_access_key_id: "test-access-key",
          aws_secret_access_key: "test-secret-key"
        })

      assert Bedrock.provider_options(bedrock)[:endpoint] == :mantle
    end

    test "maps the configured Bedrock bearer token to ReqLLM's API key option" do
      bedrock =
        Bedrock.new(%BedrockSettings{
          region: @region,
          access_token: "bedrock-token"
        })

      options = Bedrock.provider_options(bedrock)

      assert options[:api_key] == "bedrock-token"
      refute Keyword.has_key?(options, :access_token)
    end
  end

  describe "tool_call/4" do
    test "calls the configured inference profile id in the Bedrock runtime REST URL" do
      bedrock =
        Bedrock.new(%BedrockSettings{
          tool_model_id: @inference_profile_id,
          region: @region,
          aws_access_key_id: "test-access-key",
          aws_secret_access_key: "test-secret-key"
        })

      expected_url =
        "https://bedrock-runtime.#{@region}.amazonaws.com/model/#{@inference_profile_id}/converse"

      expect(Req, :request, fn %Req.Request{} = request ->
        assert request.method == :post
        assert URI.to_string(request.url) == expected_url

        {:ok,
         %Req.Response{
           status: 200,
           body: %Response{
             id: "test-response",
             model: @inference_profile_id,
             context: %ReqLLM.Context{messages: []},
             message: %Message{
               role: :assistant,
               content: [],
               tool_calls: [
                 ToolCall.new("call-1", "enable_tools", ~s({"tools":["search"]}))
               ]
             },
             finish_reason: :tool_use,
             usage: @usage,
             stream?: false
           }
         }}
      end)

      assert {:ok, [%Tool{name: "enable_tools"} | _]} =
               Bedrock.tool_call(
                 bedrock,
                 [{:user, "enable search"}],
                 [%Console.AI.Tools.EnableTools{}],
                 []
               )
    end
  end

  describe "completion/3" do
    test "routes a configured model through its application inference profile ARN" do
      model_id = "anthropic.claude-sonnet-4-6"

      bedrock =
        Bedrock.new(%BedrockSettings{
          model_id: model_id,
          model_settings: [
            %{model_id: model_id, inference_profile_arn: @application_profile_arn}
          ],
          region: @region,
          aws_access_key_id: "test-access-key",
          aws_secret_access_key: "test-secret-key"
        })

      expected_url =
        "https://bedrock-runtime.#{@region}.amazonaws.com/model/#{@encoded_application_profile_arn}/invoke"

      expect(Req, :request, fn %Req.Request{} = request ->
        assert request.method == :post
        assert URI.to_string(request.url) == expected_url

        {:ok,
         %Req.Response{
           status: 200,
           body: %Response{
             id: "test-response",
             model: model_id,
             context: %ReqLLM.Context{messages: []},
             message: %Message{
               role: :assistant,
               content: [%ContentPart{type: :text, text: "hello through profile"}]
             },
             finish_reason: :stop,
             usage: @usage,
             stream?: false
           }
         }}
      end)

      assert {:ok, %Response{} = response} =
               Bedrock.completion(bedrock, [{:user, "hi"}], [])
      assert Response.text(response) == "hello through profile"
    end

    test "calls and SigV4-signs the configured Bedrock Mantle endpoint" do
      model_id = "anthropic.claude-sonnet-4-6"

      bedrock =
        Bedrock.new(%BedrockSettings{
          model_id: model_id,
          region: @region,
          endpoint: :mantle,
          aws_access_key_id: "test-access-key",
          aws_secret_access_key: "test-secret-key"
        })

      expected_url = "https://bedrock-mantle.#{@region}.api.aws/anthropic/v1/messages"

      expect(Req, :request, fn %Req.Request{} = request ->
        assert request.method == :post
        assert URI.to_string(request.url) == expected_url
        assert Keyword.has_key?(request.request_steps, :aws_sigv4)

        {:ok,
         %Req.Response{
           status: 200,
           body: %Response{
             id: "test-response",
             model: model_id,
             context: %ReqLLM.Context{messages: []},
             message: %Message{
               role: :assistant,
               content: [%ContentPart{type: :text, text: "hello from mantle"}]
             },
             finish_reason: :stop,
             usage: @usage,
             stream?: false
           }
         }}
      end)

      assert {:ok, %Response{} = response} =
               Bedrock.completion(bedrock, [{:user, "hi"}], [])
      assert Response.text(response) == "hello from mantle"
    end

    test "sets GPT-5.6 reasoning to low without lowering its output token limit" do
      model_id = "openai.gpt-5.6-terra"

      bedrock =
        Bedrock.new(%BedrockSettings{
          model_id: model_id,
          region: @region,
          endpoint: :mantle,
          aws_access_key_id: "test-access-key",
          aws_secret_access_key: "test-secret-key"
        })

      expect(Req, :request, fn %Req.Request{} = request ->
        body = Jason.decode!(request.body)

        assert URI.to_string(request.url) ==
                 "https://bedrock-mantle.#{@region}.api.aws/openai/v1/responses"

        assert body["reasoning"] == %{"effort" => "low"}
        assert body["max_output_tokens"] == 128_000

        {:ok,
         %Req.Response{
           status: 200,
           body: %Response{
             id: "test-response",
             model: model_id,
             context: %ReqLLM.Context{messages: []},
             message: %Message{
               role: :assistant,
               content: [%ContentPart{type: :text, text: "hello with low reasoning"}]
             },
             finish_reason: :stop,
             usage: @usage,
             stream?: false
           }
         }}
      end)

      assert {:ok, %Response{} = response} =
               Bedrock.completion(bedrock, [{:user, "hi"}], [])
      assert Response.text(response) == "hello with low reasoning"
    end

    test "calls the configured inference profile id in the Bedrock runtime REST URL" do
      bedrock =
        Bedrock.new(%BedrockSettings{
          model_id: @inference_profile_id,
          region: @region,
          aws_access_key_id: "test-access-key",
          aws_secret_access_key: "test-secret-key"
        })

      expected_url =
        "https://bedrock-runtime.#{@region}.amazonaws.com/model/#{@inference_profile_id}/invoke"

      expect(Req, :request, fn %Req.Request{} = request ->
        assert request.method == :post
        assert URI.to_string(request.url) == expected_url

        {:ok,
         %Req.Response{
           status: 200,
           body: %Response{
             id: "test-response",
             model: @inference_profile_id,
             context: %ReqLLM.Context{messages: []},
             message: %Message{
               role: :assistant,
               content: [%ContentPart{type: :text, text: "hello"}]
             },
             finish_reason: :stop,
             usage: @usage,
             stream?: false
           }
         }}
      end)

      assert {:ok, %Response{} = response} =
               Bedrock.completion(bedrock, [{:user, "hi"}], [])
      assert Response.text(response) == "hello"
    end
  end
end
