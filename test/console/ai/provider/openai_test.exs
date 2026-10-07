defmodule Console.AI.Provider.OpenAITest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Provider
  alias ReqLLM.{Message, Message.ContentPart, Response}

  setup :set_mimic_global

  describe "completion/3" do
    test "passes configured headers through to Req" do
      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{
            access_token: "test-key",
            model: "gpt-5.4-mini",
            method: :chat,
            headers: [
              %{name: "X-Plural-Org", value: "test-org"},
              %{name: "X-Trace-Id", value: "trace-123"}
            ]
          }
        }
      )

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

      assert {:ok, %Response{} = response} =
               Provider.reqllm_completion([{:user, "ping"}], preface: :ignore)
      assert Response.text(response) == "ok"
    end

    test "passes configured accept header through to Req" do
      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{
            access_token: "test-key",
            model: "gpt-5.4-mini",
            method: :chat,
            headers: [
              %{name: "Accept", value: "application/json;v=1"}
            ]
          }
        }
      )

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

      assert {:ok, "ok"} = Provider.completion([{:user, "ping"}], preface: :ignore)
    end

    test "passes the provider proxy through to Req connection options" do
      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{
            access_token: "test-key",
            model: "gpt-5.4-mini",
            method: :chat,
            proxy: %{url: "http://proxy.example.com:8080"}
          }
        }
      )

      expect(Req, :request, fn %Req.Request{} = request ->
        assert request.options[:connect_options][:proxy] ==
                 {:http, "proxy.example.com", 8080, []}

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

      assert {:ok, "ok"} = Provider.completion([{:user, "ping"}], preface: :ignore)
    end

    test "ignores a provider proxy only when explicitly disabled" do
      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{
            access_token: "test-key",
            model: "gpt-5.4-mini",
            method: :chat,
            proxy: %{enabled: false, url: "http://proxy.example.com:8080"}
          }
        }
      )

      expect(Req, :request, fn %Req.Request{} = request ->
        refute request.options[:connect_options]

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

      assert {:ok, "ok"} = Provider.completion([{:user, "ping"}], preface: :ignore)
    end

    test "supplies a pricing context that prices the default openai models" do
      defaults = Provider.model_defaults(:openai)

      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "test-key"}
        }
      )

      for model <- Enum.uniq([defaults.model, defaults.tool_model]) do
        test = self()

        expect(Req, :request, fn %Req.Request{} = request ->
          send(test, {:pricing_context, request.private[:req_llm_pricing_context]})

          {:ok,
           %Req.Response{
             status: 200,
             body: %Response{
               id: "test-response",
               model: model,
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

        assert {:ok, "ok"} = Provider.completion([{:user, "ping"}], preface: :ignore, model: model)
        assert_receive {:pricing_context, %{service_tier: "default", regional_processing: false} = ctx}

        usage = ReqLLM.Usage.normalize(%{input_tokens: 1_000, output_tokens: 100, cached_tokens: 100})
        {:ok, llm_model} = ReqLLM.model({:openai, id: model})

        assert {:ok, %{total_cost: cost}} = ReqLLM.Usage.Cost.breakdown(usage, llm_model, ctx)
        assert cost > 0
      end
    end
  end
end
