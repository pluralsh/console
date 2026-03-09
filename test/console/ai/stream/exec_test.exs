defmodule Console.AI.Stream.ExecTest do
  use Console.DataCase, async: true
  alias Console.AI.Stream.Exec

  # Note: The handler functions (handle_openai, handle_anthropic, handle_openai_responses)
  # need to be made public (def instead of defp) for these unit tests to work directly.
  # Alternatively, these could be tested through integration tests.

  describe "handle_openai/1 (Chat Completions API)" do
    test "extracts content from delta" do
      data = %{"choices" => [%{"delta" => %{"content" => "Hello"}}]}
      assert Exec.handle_openai(data) == "Hello"
    end

    test "extracts content from delta with empty string" do
      data = %{"choices" => [%{"delta" => %{"content" => ""}}]}
      assert Exec.handle_openai(data) == :pass
    end

    test "extracts tool calls with function data" do
      data = %{
        "choices" => [
          %{
            "delta" => %{
              "tool_calls" => [
                %{
                  "index" => 0,
                  "id" => "call_abc123",
                  "function" => %{"name" => "search", "arguments" => ""}
                }
              ]
            }
          }
        ]
      }

      assert {:tools, [{0, tool}]} = Exec.handle_openai(data)
      assert tool["name"] == "search"
      assert tool["id"] == "call_abc123"
    end

    test "extracts multiple tool calls" do
      data = %{
        "choices" => [
          %{
            "delta" => %{
              "tool_calls" => [
                %{"index" => 0, "id" => "call_1", "function" => %{"name" => "tool1", "arguments" => ""}},
                %{"index" => 1, "id" => "call_2", "function" => %{"name" => "tool2", "arguments" => ""}}
              ]
            }
          }
        ]
      }

      assert {:tools, tools} = Exec.handle_openai(data)
      assert length(tools) == 2
      assert {0, %{"name" => "tool1", "id" => "call_1", "arguments" => ""}} in tools
      assert {1, %{"name" => "tool2", "id" => "call_2", "arguments" => ""}} in tools
    end

    test "extracts tool call argument deltas" do
      data = %{
        "choices" => [
          %{
            "delta" => %{
              "tool_calls" => [
                %{"index" => 0, "function" => %{"arguments" => "{\"query\":"}}
              ]
            }
          }
        ]
      }

      assert {:tools, [{0, tool}]} = Exec.handle_openai(data)
      assert tool["arguments"] == "{\"query\":"
    end

    test "returns :pass for unrecognized format" do
      assert Exec.handle_openai(%{"unknown" => "data"}) == :pass
    end

    test "returns :pass for empty choices" do
      assert Exec.handle_openai(%{"choices" => []}) == :pass
    end

    test "returns :pass for finish reason only" do
      data = %{"choices" => [%{"delta" => %{}, "finish_reason" => "stop"}]}
      assert Exec.handle_openai(data) == :pass
    end

    test "returns :pass for role-only delta" do
      data = %{"choices" => [%{"delta" => %{"role" => "assistant"}}]}
      assert Exec.handle_openai(data) == :pass
    end
  end

  describe "handle_anthropic/1 (Messages API)" do
    test "extracts text from content_block_start" do
      data = %{
        "type" => "content_block_start",
        "content_block" => %{"text" => "Hello"}
      }
      assert Exec.handle_anthropic(data) == "Hello"
    end

    test "extracts text from content_block_delta" do
      data = %{
        "type" => "content_block_delta",
        "delta" => %{"text" => "world"}
      }
      assert Exec.handle_anthropic(data) == "world"
    end

    test "extracts tool_use from content_block_start" do
      data = %{
        "type" => "content_block_start",
        "index" => 0,
        "content_block" => %{
          "type" => "tool_use",
          "id" => "tool_123",
          "name" => "search"
        }
      }

      assert {:tools, [{0, tool}]} = Exec.handle_anthropic(data)
      assert tool["type"] == "tool_use"
      assert tool["id"] == "tool_123"
      assert tool["name"] == "search"
      assert tool["arguments"] == ""
    end

    test "extracts tool arguments from input_json_delta" do
      data = %{
        "type" => "content_block_delta",
        "index" => 0,
        "delta" => %{
          "type" => "input_json_delta",
          "partial_json" => "{\"query\":"
        }
      }

      assert {:tools, [{0, tool}]} = Exec.handle_anthropic(data)
      assert tool["arguments"] == "{\"query\":"
    end

    test "returns :pass for message_start" do
      data = %{"type" => "message_start", "message" => %{}}
      assert Exec.handle_anthropic(data) == :pass
    end

    test "returns :pass for message_stop" do
      data = %{"type" => "message_stop"}
      assert Exec.handle_anthropic(data) == :pass
    end

    test "returns :pass for content_block_stop" do
      data = %{"type" => "content_block_stop", "index" => 0}
      assert Exec.handle_anthropic(data) == :pass
    end

    test "returns :pass for unrecognized format" do
      assert Exec.handle_anthropic(%{"unknown" => "data"}) == :pass
    end
  end

  describe "handle_openai_responses/1 (Responses API)" do
    test "extracts text from response.output_text.delta" do
      data = %{
        "type" => "response.output_text.delta",
        "delta" => "Hello world"
      }
      assert Exec.handle_openai_responses(data) == "Hello world"
    end

    test "extracts text from response.output_text.delta with empty string" do
      data = %{
        "type" => "response.output_text.delta",
        "delta" => ""
      }
      assert Exec.handle_openai_responses(data) == :pass
    end

    test "handles response.output_item.added for function_call" do
      data = %{
        "type" => "response.output_item.added",
        "output_index" => 0,
        "item" => %{
          "type" => "function_call",
          "id" => "fc_123",
          "name" => "search",
          "arguments" => ""
        }
      }

      assert {:tools, [{0, tool}]} = Exec.handle_openai_responses(data)
      assert tool["id"] == "fc_123"
      assert tool["name"] == "search"
      assert tool["arguments"] == ""
    end

    test "handles response.function_call_arguments.delta" do
      data = %{
        "type" => "response.function_call_arguments.delta",
        "output_index" => 0,
        "delta" => "{\"query\":"
      }

      assert {:tools, [{0, tool}]} = Exec.handle_openai_responses(data)
      assert tool["arguments"] == "{\"query\":"
    end

    test "accumulates function call arguments across multiple deltas" do
      delta1 = %{
        "type" => "response.function_call_arguments.delta",
        "output_index" => 0,
        "delta" => "{\"query\":"
      }

      delta2 = %{
        "type" => "response.function_call_arguments.delta",
        "output_index" => 0,
        "delta" => "\"test\"}"
      }

      assert {:tools, [{0, t1}]} = Exec.handle_openai_responses(delta1)
      assert {:tools, [{0, t2}]} = Exec.handle_openai_responses(delta2)

      assert t1["arguments"] == "{\"query\":"
      assert t2["arguments"] == "\"test\"}"
    end

    test "returns :pass for response.created" do
      data = %{
        "type" => "response.created",
        "response" => %{"id" => "resp_123"}
      }
      assert Exec.handle_openai_responses(data) == :pass
    end

    test "returns :pass for response.in_progress" do
      data = %{"type" => "response.in_progress"}
      assert Exec.handle_openai_responses(data) == :pass
    end

    test "returns :pass for response.completed" do
      data = %{
        "type" => "response.completed",
        "response" => %{"id" => "resp_123", "output" => []}
      }
      assert Exec.handle_openai_responses(data) == :pass
    end

    test "returns :pass for response.output_item.done" do
      data = %{
        "type" => "response.output_item.done",
        "output_index" => 0,
        "item" => %{}
      }
      assert Exec.handle_openai_responses(data) == :pass
    end

    test "returns :pass for response.content_part.added" do
      data = %{
        "type" => "response.content_part.added",
        "output_index" => 0,
        "content_index" => 0,
        "part" => %{"type" => "output_text", "text" => ""}
      }
      assert Exec.handle_openai_responses(data) == :pass
    end

    test "returns :pass for response.content_part.done" do
      data = %{
        "type" => "response.content_part.done",
        "output_index" => 0,
        "content_index" => 0,
        "part" => %{}
      }
      assert Exec.handle_openai_responses(data) == :pass
    end

    test "returns :pass for unrecognized format" do
      assert Exec.handle_openai_responses(%{"unknown" => "data"}) == :pass
    end

    test "returns :pass for nil or missing type" do
      assert Exec.handle_openai_responses(%{}) == :pass
    end
  end
end
