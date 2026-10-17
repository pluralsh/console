defmodule Console.AI.Chat.ThreadTest do
  use ExUnit.Case, async: true

  alias Console.AI.Chat.Thread
  alias ReqLLM.{Context, Message, ToolCall}

  @window 4_000

  describe "append/2" do
    test "segments messages into pinned prompt and whole turns" do
      thread =
        Thread.from_messages([
          Context.system("sys"),
          Context.tool_result("orphan", "echo", "dropped"),
          Context.user("task"),
          Context.assistant("calling", tool_calls: [ToolCall.new("call-1", "echo", "{}")]),
          Context.tool_result("call-1", "echo", "result"),
          Context.user("continue"),
          Context.assistant("done")
        ], @window)

      assert [%Message{role: :user}] = thread.pinned
      assert :queue.len(thread.turns) == 2
      assert Enum.map(Thread.to_messages(thread), & &1.role) == [:user, :assistant, :tool, :user, :assistant]
      assert Thread.last_role(thread) == :assistant
    end

    test "keeps a running token count matching the messages" do
      thread = Thread.from_messages([Context.user("task") | turns(3, tool_bytes: 500)], @window)

      assert Thread.tokens(thread) == Enum.sum_by(Thread.to_messages(thread), &Thread.message_tokens/1)
    end

    test "caps oversized tool results at insertion without splitting codepoints" do
      output = String.duplicate("é", 10_000)
      thread = Thread.from_messages([Context.user("task") | turn(0, output: output)], @window)

      [_, _, %Message{role: :tool, content: [%{text: text}]}] = Thread.to_messages(thread)
      assert String.valid?(text)
      assert text =~ "bytes elided to fit the context window"
      assert Thread.message_tokens(%Message{role: :tool, content: [%{type: :text, text: text}]}) <= 0.16 * @window
    end
  end

  describe "compact/2" do
    test "leaves threads under the high-water mark untouched" do
      thread = Thread.from_messages([Context.user("task") | turns(2, tool_bytes: 500)], @window)

      assert Thread.compact(thread, summarizer: fn _ -> flunk("should not summarize") end) == thread
    end

    test "elides old tool outputs first, keeping recent turns verbatim" do
      thread = Thread.from_messages([Context.user("task") | turns(7, tool_bytes: 2_000)], @window)
      assert Thread.tokens(thread) > 0.8 * @window

      compacted = Thread.compact(thread, keep_turns: 2, summarizer: fn _ -> flunk("should not summarize") end)

      assert Thread.tokens(compacted) <= 0.5 * @window
      assert is_nil(compacted.summary)
      outputs = tool_outputs(compacted)
      assert Enum.take(outputs, 5) |> Enum.all?(&(&1 =~ "tool output elided"))
      assert Enum.drop(outputs, 5) |> Enum.all?(&(&1 =~ "OUTPUT"))
    end

    test "summarizes older turns from their unelided content when elision isn't enough" do
      test = self()
      thread = Thread.from_messages([Context.user("task") | turns(7, text_bytes: 1_500, tool_bytes: 1_000)], @window)

      compacted =
        Thread.compact(thread, keep_turns: 2, summarizer: fn transcript ->
          send(test, {:transcript, transcript})
          {:ok, "the agent echoed things"}
        end)

      assert_received {:transcript, transcript}
      # turns 0-4 are folded, and the transcript is capped to its most recent part
      assert transcript =~ "OUTPUT-4"
      refute transcript =~ "tool output elided"
      assert Thread.tokens(compacted) <= 0.5 * @window
      assert :queue.len(compacted.turns) == 2
      assert [%Message{role: :user}, %Message{role: :user} = summary | _] = Thread.to_messages(compacted)
      assert Enum.map_join(summary.content, & &1.text) =~ "the agent echoed things"

      # the summary survives a round trip through a flat message list
      roundtrip = Thread.from_messages(Thread.to_messages(compacted), @window)
      assert roundtrip.summary == compacted.summary
      assert length(roundtrip.pinned) == 1
    end

    test "falls back to dropping whole turns when summarization fails" do
      thread = Thread.from_messages([Context.user("task") | turns(7, text_bytes: 1_500, tool_bytes: 1_000)], @window)

      compacted = Thread.compact(thread, keep_turns: 2, summarizer: fn _ -> {:error, :boom} end)

      assert is_nil(compacted.summary)
      assert Thread.tokens(compacted) <= 0.5 * @window
      assert :queue.len(compacted.turns) >= 1

      messages = Thread.to_messages(compacted)
      assert hd(messages).role == :user
      # every tool result still follows the assistant message that called it
      messages
      |> Enum.chunk_every(2, 1, :discard)
      |> Enum.each(fn
        [_, %Message{role: :tool}] = [prev, _] -> assert prev.role == :assistant
        _ -> :ok
      end)
    end

    test "scales thresholds by provider-reported usage" do
      thread = Thread.from_messages([Context.user("task") | turns(4, tool_bytes: 2_000)], @window)
      assert Thread.compact(thread) == thread

      calibrated = Thread.calibrate(thread, Thread.tokens(thread), Thread.tokens(thread) * 2)
      assert calibrated.scale == 2.0
      assert Thread.compact(calibrated) != calibrated
      assert Thread.calibrate(thread, 100, 10_000).scale == 4.0
    end
  end

  defp turns(n, opts), do: Enum.flat_map(0..(n - 1), &turn(&1, opts))

  defp turn(i, opts) do
    text = String.duplicate("a", Keyword.get(opts, :text_bytes, 10))
    output = Keyword.get_lazy(opts, :output, fn -> "OUTPUT-#{i} " <> String.duplicate("o", Keyword.get(opts, :tool_bytes, 10)) end)

    [
      Context.assistant(text, tool_calls: [ToolCall.new("call-#{i}", "echo", ~s({"value":"#{i}"}))]),
      Context.tool_result("call-#{i}", "echo", output)
    ]
  end

  defp tool_outputs(thread) do
    thread
    |> Thread.to_messages()
    |> Enum.filter(&(&1.role == :tool))
    |> Enum.map(fn %Message{content: content} -> Enum.map_join(content, & &1.text) end)
  end
end
