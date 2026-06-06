defmodule Console.AI.MemoizerTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Memoizer
  alias Console.AI.Tools.Insight

  @base_model "gpt-5.4"
  @tool_model "gpt-5.5"

  setup :set_mimic_global

  describe "generate/1" do
    test "uses the provider base model, not the tool model, when generating an insight" do
      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{
            access_token: "key",
            model: @base_model,
            tool_model: @tool_model
          }
        }
      )

      svc = insert(:service)

      alert =
        insert(:alert,
          state: :firing,
          service: svc,
          insight: build(:ai_insight, text: nil)
        )

      expect(ReqLLM, :generate_text, 2, fn model, _messages, opts ->
        assert model.model == @base_model
        refute model.model == @tool_model

        case Keyword.get(opts, :tool_choice) do
          :required ->
            insight_tool_response(model.model)

          _ ->
            summary_response(model.model)
        end
      end)

      assert {:ok, insight} = Memoizer.generate(alert)
      assert is_binary(insight.text)
      assert is_binary(insight.summary)
    end
  end

  defp insight_tool_response(model) do
    Jason.encode!(%{
      object: "response",
      output: [
        %{
          type: "function_call",
          call_id: "call_insight",
          id: "call_insight",
          status: "completed",
          name: Insight.name(),
          arguments:
            Jason.encode!(%{
              "summary" => "summary",
              "root_cause" => "root cause",
              "key_evidence" => ["key evidence"],
              "contextual_observations" => ["contextual observations"]
            })
        }
      ]
    })
    |> ReqLLM.Response.decode_response("openai:#{model}")
  end

  defp summary_response(model) do
    Jason.encode!(%{
      id: "resp_summary",
      object: "response",
      output: [
        %{
          type: "message",
          id: "msg_summary",
          status: "completed",
          role: "assistant",
          content: [%{type: "output_text", text: "brief summary"}]
        }
      ]
    })
    |> ReqLLM.Response.decode_response("openai:#{model}")
  end
end
