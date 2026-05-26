defmodule Console.AI.Provider.BedrockTest do
  use ExUnit.Case, async: false
  use Mimic

  alias Console.AI.{Bedrock, Tool}
  alias Console.Schema.DeploymentSettings.AI.Bedrock, as: BedrockSettings
  alias ReqLLM.{Message, Message.ContentPart, Response, ToolCall}

  @inference_profile_id "us.anthropic.claude-sonnet-4-6"
  @region "us-east-2"
  @usage %{input_tokens: 10, output_tokens: 5, total_tokens: 15}

  setup :set_mimic_global

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

      assert {:ok, "hello"} =
               Bedrock.completion(bedrock, [{:user, "hi"}], [])
    end
  end
end
