defmodule Console.AI.Chat.Thread do
  @moduledoc """
  A compactable view of an agent conversation, used by `Console.AI.Chat.MemoryEngine` to keep long
  threads within the model's context window.

  Messages are segmented into:

  * `pinned` - everything before the first assistant message (the task prompt), never compacted
  * `summary` - a single rolling summary of turns that have been folded away
  * `turns` - a queue of turns, each an assistant message plus the tool results and user messages
    that follow it.  Compaction only ever operates on whole turns, so tool calls are never separated
    from their results

  Token counts are estimated once per message as it's appended and maintained as a running total, and
  `calibrate/3` scales them against the provider-reported input tokens so thresholds track reality.

  Compaction uses hysteresis: nothing happens until the thread passes 80% of the window, then it's
  compacted down to 50%, cheapest strategy first:

  1. elide tool outputs in all but the most recent turns
  2. fold those older turns into the rolling summary with an LLM call
  3. drop the oldest turns
  4. elide tool outputs everywhere

  Compacting rarely and in large steps keeps the request prefix stable between compactions, so it stays
  cacheable by the provider.
  """
  alias ReqLLM.{Message, ToolCall}
  alias ReqLLM.Message.ContentPart

  @high_water 0.8
  @low_water 0.5
  @message_cap 0.15
  @keep_turns 4
  @min_scale 0.5
  @max_scale 4.0
  @elide_arguments 2_048
  @render_limit 4_000

  @summary_open "<prior_progress>"
  @summary_close "</prior_progress>"

  @compaction_prompt """
  You are compacting the history of a long-running autonomous agent so it can keep working within a limited context window.
  You'll be given the previous summary of its progress (if any) followed by the oldest part of its conversation.
  Write an updated summary that fully replaces the previous one. Preserve everything the agent needs to continue:

  * the overall goal and any constraints or instructions it was given
  * concrete findings: resource names, ids, versions, file paths, error messages, and command results that matter
  * actions already taken (especially ones with side effects) and their outcomes
  * hypotheses ruled out and open questions or next steps

  Be dense and specific rather than narrative. Do not invent details. Respond with only the summary.
  """

  defmodule Turn do
    @moduledoc false
    @type t :: %__MODULE__{messages: [ReqLLM.Message.t()], tokens: non_neg_integer, elided: boolean}

    # messages are kept newest-first so appending to the open turn is O(1)
    defstruct messages: [], tokens: 0, elided: false
  end

  defstruct pinned: [],
            summary: nil,
            turns: :queue.new(),
            tokens: 0,
            window: nil,
            scale: 1.0

  @type t :: %__MODULE__{
          pinned: [Message.t()],
          summary: Message.t() | nil,
          turns: :queue.queue(Turn.t()),
          tokens: non_neg_integer,
          window: pos_integer,
          scale: float
        }

  @type summarizer :: (binary -> {:ok, binary} | term)

  @spec new(pos_integer) :: t()
  def new(window) when is_integer(window) and window > 0, do: %__MODULE__{window: window}

  @doc """
  Builds a thread from a flat message list, dropping system messages since the engine sets the system
  prompt per request.
  """
  @spec from_messages([Message.t()], pos_integer) :: t()
  def from_messages(messages, window), do: append(new(window), messages)

  @spec compaction_prompt() :: binary
  def compaction_prompt(), do: @compaction_prompt

  @spec tokens(t()) :: non_neg_integer
  def tokens(%__MODULE__{tokens: tokens}), do: tokens

  @spec empty?(t()) :: boolean
  def empty?(%__MODULE__{pinned: [], summary: nil, turns: turns}), do: :queue.is_empty(turns)
  def empty?(_), do: false

  @spec to_messages(t()) :: [Message.t()]
  def to_messages(%__MODULE__{pinned: pinned, summary: summary, turns: turns}) do
    turns
    |> :queue.to_list()
    |> Enum.flat_map(&Enum.reverse(&1.messages))
    |> then(&(pinned ++ List.wrap(summary) ++ &1))
  end

  @doc "The role of the most recent message in the thread"
  @spec last_role(t()) :: atom | nil
  def last_role(%__MODULE__{turns: turns, summary: summary, pinned: pinned}) do
    case :queue.peek_r(turns) do
      {:value, %Turn{messages: [%Message{role: role} | _]}} -> role
      :empty ->
        case {summary, List.last(pinned)} do
          {%Message{role: role}, _} -> role
          {_, %Message{role: role}} -> role
          _ -> nil
        end
    end
  end

  @spec append(t(), Message.t() | [Message.t()]) :: t()
  def append(%__MODULE__{} = thread, messages) when is_list(messages),
    do: Enum.reduce(messages, thread, &append(&2, &1))

  def append(%__MODULE__{} = thread, %Message{role: :system}), do: thread

  def append(%__MODULE__{} = thread, %Message{role: :assistant} = message) do
    {message, tokens} = sized(thread, message)
    %{thread | turns: :queue.in(%Turn{messages: [message], tokens: tokens}, thread.turns), tokens: thread.tokens + tokens}
  end

  def append(%__MODULE__{turns: turns} = thread, %Message{} = message) do
    case :queue.out_r(turns) do
      {{:value, %Turn{} = turn}, rest} ->
        {message, tokens} = sized(thread, message)
        turn = %{turn | messages: [message | turn.messages], tokens: turn.tokens + tokens}
        %{thread | turns: :queue.in(turn, rest), tokens: thread.tokens + tokens}

      {:empty, _} ->
        append_leading(thread, message)
    end
  end

  # tool results only make sense after the assistant message that called them
  defp append_leading(thread, %Message{role: :tool}), do: thread

  defp append_leading(thread, %Message{} = message) do
    {message, tokens} = sized(thread, message)

    case summary?(message) do
      true ->
        %{thread | summary: message, tokens: thread.tokens - summary_tokens(thread) + tokens}

      false ->
        %{thread | pinned: thread.pinned ++ [message], tokens: thread.tokens + tokens}
    end
  end

  @doc """
  Rescales token estimates using the input tokens a provider actually reported for a request whose
  estimated size was `estimated`.  Tool definitions and provider framing are absorbed into the scale.
  """
  @spec calibrate(t(), non_neg_integer, term) :: t()
  def calibrate(%__MODULE__{} = thread, estimated, observed)
      when is_integer(estimated) and estimated > 0 and is_integer(observed) and observed > 0,
      do: %{thread | scale: min(max(observed / estimated, @min_scale), @max_scale)}
  def calibrate(thread, _, _), do: thread

  @doc """
  Compacts the thread if it's past the high-water mark.

  Options:
    * `:reserved` - estimated tokens for the rest of the request, eg the system prompt
    * `:summarizer` - `(transcript -> {:ok, summary})` used to fold old turns into the rolling summary
    * `:summary_window` - context window of the summarizer's model (or a zero-arity function resolving it), if smaller than the thread's
    * `:keep_turns` - how many recent turns to keep verbatim (default #{@keep_turns})
  """
  @spec compact(t(), keyword) :: t()
  def compact(%__MODULE__{} = thread, opts \\ []) do
    reserved = Keyword.get(opts, :reserved, 0)

    case fits?(thread, reserved, @high_water) do
      true -> thread
      false -> do_compact(thread, reserved, opts)
    end
  end

  defp do_compact(thread, reserved, opts) do
    older = max(:queue.len(thread.turns) - Keyword.get(opts, :keep_turns, @keep_turns), 0)

    [
      &elide_turns(&1, older),
      # summarize from the unelided turns so the summary sees full tool outputs
      &(summarize(thread, older, opts) || &1),
      &elide_turns(&1, :queue.len(&1.turns) - 1),
      &drop_oldest(&1, reserved)
    ]
    |> Enum.reduce_while(thread, fn step, thread ->
      thread = step.(thread)
      case fits?(thread, reserved, @low_water) do
        true -> {:halt, thread}
        false -> {:cont, thread}
      end
    end)
    |> then(fn thread ->
      case fits?(thread, reserved, 1.0) do
        true -> thread
        false -> elide_turns(thread, :queue.len(thread.turns))
      end
    end)
  end

  defp fits?(%__MODULE__{} = thread, reserved, ratio),
    do: (thread.tokens + reserved) * thread.scale <= ratio * thread.window

  defp elide_turns(%__MODULE__{} = thread, count) when count <= 0, do: thread

  defp elide_turns(%__MODULE__{turns: turns} = thread, count) do
    {older, recent} = :queue.split(min(count, :queue.len(turns)), turns)

    {older, saved} =
      :queue.fold(fn turn, {acc, saved} ->
        elided = elide_turn(turn)
        {:queue.in(elided, acc), saved + turn.tokens - elided.tokens}
      end, {:queue.new(), 0}, older)

    %{thread | turns: :queue.join(older, recent), tokens: thread.tokens - saved}
  end

  defp elide_turn(%Turn{elided: true} = turn), do: turn

  defp elide_turn(%Turn{messages: messages} = turn) do
    messages = Enum.map(messages, &elide_message/1)
    %{turn | messages: messages, tokens: Enum.sum_by(messages, &message_tokens/1), elided: true}
  end

  defp elide_message(%Message{role: :tool} = message) do
    stub = "[tool output elided to save context (~#{message_tokens(message)} tokens). Call #{message.name || "the tool"} again if you still need it.]"
    %{message | content: [ContentPart.text(stub)]}
  end

  defp elide_message(%Message{role: :assistant, tool_calls: [_ | _] = calls} = message),
    do: %{message | tool_calls: Enum.map(calls, &elide_arguments/1)}

  defp elide_message(message), do: message

  defp elide_arguments(%ToolCall{function: %{arguments: args} = function} = call)
       when is_binary(args) and byte_size(args) > @elide_arguments,
       do: %{call | function: %{function | arguments: Jason.encode!(%{elided: "#{byte_size(args)} bytes of arguments elided to save context"})}}

  defp elide_arguments(call), do: call

  defp summarize(_, older, _) when older <= 0, do: nil

  defp summarize(thread, older, opts) do
    with summarizer when is_function(summarizer, 1) <- opts[:summarizer],
      do: do_summarize(thread, older, summarizer, summary_window(opts[:summary_window], thread))
  end

  defp summary_window(fun, thread) when is_function(fun, 0), do: summary_window(fun.(), thread)
  defp summary_window(window, %__MODULE__{window: default}) when is_integer(window) and window > 0, do: min(window, default)
  defp summary_window(_, %__MODULE__{window: default}), do: default

  defp do_summarize(thread, older, summarizer, window) do
    {folded, kept} = :queue.split(older, thread.turns)
    folded = :queue.to_list(folded)

    case summarizer.(transcript(thread, folded, window)) do
      {:ok, text} when is_binary(text) and byte_size(text) > 0 ->
        summary = ReqLLM.Context.user("#{@summary_open}\nSummary of earlier progress on this task (older messages were compacted):\n#{text}\n#{@summary_close}")
        tokens = message_tokens(summary)
        folded_tokens = Enum.sum_by(folded, & &1.tokens)

        %{thread | summary: summary, turns: kept, tokens: thread.tokens - folded_tokens - summary_tokens(thread) + tokens}

      _ -> nil
    end
  end

  defp drop_oldest(%__MODULE__{turns: turns} = thread, reserved) do
    with false <- fits?(thread, reserved, @low_water),
         true <- :queue.len(turns) > 1,
         {{:value, %Turn{tokens: tokens}}, rest} <- :queue.out(turns) do
      drop_oldest(%{thread | turns: rest, tokens: thread.tokens - tokens}, reserved)
    else
      _ -> thread
    end
  end

  defp transcript(%__MODULE__{summary: summary}, turns, window) do
    prior = case summary do
      %Message{} -> ["Previous summary:\n", text(summary), "\n\n"]
      _ -> []
    end

    body =
      turns
      |> Enum.flat_map(&Enum.reverse(&1.messages))
      |> Enum.map(&render/1)
      |> Enum.intersperse("\n\n")

    IO.iodata_to_binary([prior, "Conversation to fold into the summary:\n\n" | body])
    # the summarizer shares this window, so keep the most recent part of anything too large
    |> tail(trunc(window * @low_water) * 4)
  end

  defp render(%Message{role: :assistant, tool_calls: calls} = message) do
    calls = Enum.map(calls || [], fn %ToolCall{function: %{name: name, arguments: args}} ->
      "\n  called #{name}(#{clip(args, div(@render_limit, 4))})"
    end)
    ["assistant: ", clip(text(message), @render_limit) | calls]
  end
  defp render(%Message{role: :tool, name: name} = message),
    do: ["tool result (#{name || "unknown"}): ", clip(text(message), @render_limit)]
  defp render(%Message{role: role} = message), do: ["#{role}: ", clip(text(message), @render_limit)]

  defp text(%Message{content: content}) do
    content
    |> List.wrap()
    |> Enum.map_join("\n", fn
      %{text: text} when is_binary(text) -> text
      _ -> ""
    end)
  end

  defp clip(str, limit) when is_binary(str) and byte_size(str) > limit,
    do: head(str, limit) <> " [...]"
  defp clip(str, _) when is_binary(str), do: str
  defp clip(_, _), do: ""

  defp summary?(%Message{role: :user} = message), do: String.starts_with?(text(message), @summary_open)
  defp summary?(_), do: false

  defp summary_tokens(%__MODULE__{summary: %Message{} = summary}), do: message_tokens(summary)
  defp summary_tokens(_), do: 0

  defp sized(%__MODULE__{window: window}, %Message{role: :tool} = message) do
    cap = trunc(window * @message_cap)
    message = case message_tokens(message) > cap do
      true -> %{message | content: Enum.map(message.content || [], &cap_part(&1, cap * 4))}
      false -> message
    end
    {message, message_tokens(message)}
  end
  defp sized(_, message), do: {message, message_tokens(message)}

  defp cap_part(%ContentPart{text: text} = part, limit) when is_binary(text) and byte_size(text) > limit do
    keep = div(limit, 3)
    elided = byte_size(text) - 3 * keep
    %{part | text: head(text, 2 * keep) <> "\n[... #{elided} bytes elided to fit the context window ...]\n" <> tail(text, keep)}
  end
  defp cap_part(part, _), do: part

  defp head(bin, n) when byte_size(bin) <= n, do: bin
  defp head(bin, n), do: valid_prefix(binary_part(bin, 0, n))

  defp tail(bin, n) when byte_size(bin) <= n, do: bin
  defp tail(bin, n), do: valid_suffix(binary_part(bin, byte_size(bin) - n, n))

  # a byte cut can split a multibyte codepoint, which is at most 4 bytes
  defp valid_prefix(bin, attempts \\ 4)
  defp valid_prefix(bin, 0), do: bin
  defp valid_prefix(bin, attempts) do
    case String.valid?(bin) do
      true -> bin
      false -> valid_prefix(binary_part(bin, 0, max(byte_size(bin) - 1, 0)), attempts - 1)
    end
  end

  defp valid_suffix(bin, attempts \\ 4)
  defp valid_suffix(bin, 0), do: bin
  defp valid_suffix(<<_, rest::binary>> = bin, attempts) do
    case String.valid?(bin) do
      true -> bin
      false -> valid_suffix(rest, attempts - 1)
    end
  end
  defp valid_suffix(bin, _), do: bin

  @doc """
  Estimates the tokens a provider will bill for a message from the values it actually encodes, since
  ReqLLM has no tokenizer-independent counter.
  """
  @spec message_tokens(Message.t()) :: non_neg_integer
  def message_tokens(%Message{} = message) do
    content_size = Enum.sum_by(message.content || [], &content_part_size/1)
    tool_calls_size = Enum.sum_by(message.tool_calls || [], &tool_call_size/1)

    payload_size =
      content_size +
        tool_calls_size +
        value_size(message.name) +
        value_size(message.tool_call_id) +
        encoded_size(message.reasoning_details)

    estimate_tokens(payload_size) + 4
  end

  @spec estimate_tokens(non_neg_integer) :: non_neg_integer
  def estimate_tokens(0), do: 0
  def estimate_tokens(bytes), do: div(bytes + 3, 4)

  # providers bill images by resolution rather than encoded size, topping out around 1.6k tokens
  defp content_part_size(%{type: :image}), do: 1_600 * 4
  defp content_part_size(part) do
    value_size(Map.get(part, :text)) +
      value_size(Map.get(part, :url)) +
      encoded_binary_size(Map.get(part, :data)) +
      value_size(Map.get(part, :file_id)) +
      value_size(Map.get(part, :media_type)) +
      value_size(Map.get(part, :filename))
  end

  defp tool_call_size(%ToolCall{id: id, type: type, function: %{name: name, arguments: arguments}}),
    do: value_size(id) + value_size(type) + value_size(name) + value_size(arguments)
  defp tool_call_size(tool_call), do: encoded_size(tool_call)

  defp value_size(value) when is_binary(value), do: byte_size(value)
  defp value_size(_), do: 0

  defp encoded_binary_size(value) when is_binary(value), do: div(byte_size(value) * 4 + 2, 3)
  defp encoded_binary_size(_), do: 0

  @doc false
  def encoded_size(nil), do: 0
  def encoded_size(value) do
    case Jason.encode(value) do
      {:ok, encoded} -> byte_size(encoded)
      _ -> 0
    end
  end
end
