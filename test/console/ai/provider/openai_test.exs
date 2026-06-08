defmodule Console.AI.Provider.OpenAITest do
  use ExUnit.Case, async: false
  use Mimic

  alias Console.AI.OpenAI
  alias ReqLLM.{Message, Message.ContentPart, Response}

  setup :set_mimic_global

  describe "completion/3" do
    test "passes configured headers through to Req" do
      openai =
        OpenAI.new(%{
          access_token: "test-key",
          model: "gpt-5.4-mini",
          method: :chat,
          headers: [
            %{name: "X-Plural-Org", value: "test-org"},
            %{name: "X-Trace-Id", value: "trace-123"}
          ]
        })

      expect(Req, :request, fn %Req.Request{} = request ->
        assert request.method == :post
        assert Req.Request.get_header(request, "x-plural-org") == ["test-org"]
        assert Req.Request.get_header(request, "x-trace-id") == ["trace-123"]

        {:ok,
         %Req.Response{
           status: 200,
           body: %Response{
             id: "test-response",
             model: "gpt-5.4-mini",
             context: %ReqLLM.Context{messages: []},
             message: %Message{
               role: :assistant,
               content: [%ContentPart{type: :text, text: "ok"}]
             },
             finish_reason: :stop,
             usage: %{input_tokens: 1, output_tokens: 1, total_tokens: 2},
             stream?: false
           }
         }}
      end)

      assert {:ok, "ok"} = OpenAI.completion(openai, [{:user, "ping"}], [])
    end

    test "passes configured accept header through to Req" do
      openai =
        OpenAI.new(%{
          access_token: "test-key",
          model: "gpt-5.4-mini",
          method: :chat,
          headers: [
            %{name: "Accept", value: "application/json;v=1"}
          ]
        })

      expect(Req, :request, fn %Req.Request{} = request ->
        assert request.method == :post
        assert Req.Request.get_header(request, "accept") == ["application/json;v=1"]

        {:ok,
         %Req.Response{
           status: 200,
           body: %Response{
             id: "test-response",
             model: "gpt-5.4-mini",
             context: %ReqLLM.Context{messages: []},
             message: %Message{
               role: :assistant,
               content: [%ContentPart{type: :text, text: "ok"}]
             },
             finish_reason: :stop,
             usage: %{input_tokens: 1, output_tokens: 1, total_tokens: 2},
             stream?: false
           }
         }}
      end)

      assert {:ok, "ok"} = OpenAI.completion(openai, [{:user, "ping"}], [])
    end
  end
end
