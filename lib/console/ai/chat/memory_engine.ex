defmodule Console.AI.Chat.MemoryEngine do
  @moduledoc """
  Performs an agent chat loop entirely in memory.  This allows for reusable agentic behavior w/o being tied to the chat data model
  or any other costly persistence, but with a callback to hook in if desired
  """
  import Console.GraphQl.Helpers, only: [resolve_changeset: 1]
  alias Console.AI.Provider.Base
  alias Console.AI.{Provider, Tool}
  alias Console.AI.Chat.EnabledTools
  alias Console.AI.Tools.{EnableTools, ToolSearch}
  alias ReqLLM.{Context, Response}
  require Logger

  @type t :: %__MODULE__{}

  @sleep 20

  defstruct [
    :tools,
    :system_prompt,
    :max_iterations,
    :reducer,
    :enabled_tools,
    :callback,
    :provider,
    :model,
    :usage_callback,
    continue_msg: "looks like we aren't done let's continue",
    context: %Context{messages: [], tools: []},
    pre_enable: [],
    policies: [],
    acc: [],
    tool_fmt: &Console.identity/1,
    tool_search: false,
  ]

  def new(tools, max_iterations, opts \\ []) when is_integer(max_iterations) and max_iterations > 0 do
    struct(__MODULE__, Keyword.merge(opts, [tools: tools, max_iterations: max_iterations]))
  end

  def run(%__MODULE__{} = engine, [_ | _] = messages) do
    engine = setup_toolsearch(%__MODULE__{engine | reducer: fn l, acc -> {:cont, l ++ acc} end})

    append_context(engine, messages)
    |> loop()
  end

  def run(%__MODULE__{} = engine, %Context{messages: [_ | _]} = context) do
    engine = setup_toolsearch(%__MODULE__{engine | reducer: fn l, acc -> {:cont, l ++ acc} end})

    append_context(engine, context)
    |> loop()
  end

  @doc """
  Reduces the engine by running a completion and then calling the reducer function with the result.

  The reducer function is a two-arity function of messages and accumulator.  It should return a tuple of {:halt, result} if the reduction should halt, or the new accumulator if the reduction should continue.
  """
  def reduce(%__MODULE__{} = engine, [_ | _] = messages, reducer) when is_function(reducer, 2) do
    engine = setup_toolsearch(%__MODULE__{engine | reducer: reducer})

    append_context(engine, messages)
    |> loop()
  end

  def reduce(%__MODULE__{} = engine, %Context{messages: [_ | _]} = context, reducer)
      when is_function(reducer, 2) do
    engine = setup_toolsearch(%__MODULE__{engine | reducer: reducer})

    append_context(engine, context)
    |> loop()
  end

  def last_message(messages) do
    Enum.reverse(messages)
    |> Enum.find(&match?({:assistant, content} when is_binary(content), &1))
    |> case do
      {:assistant, content} when is_binary(content) -> content
      _ -> "no reason given for failure"
    end
    |> then(& {:cont, &1})
  end

  def fit_context_window(msgs, preface) when is_list(msgs) do
    Enum.reduce(msgs, byte_size(preface), &msg_size(&1) + &2)
    |> trim_messages(msgs, Provider.context_window(:tool))
  end

  def fit_context_window(%Context{messages: messages} = context, _preface) do
    window = Provider.context_window(:tool)

    case messages do
      [%ReqLLM.Message{role: :system} = system | rest] ->
        available = max(window - msg_size(system), 0)
        %{context | messages: [system | trim_context_messages(rest, available)]}
      _ ->
        %{context | messages: trim_context_messages(messages, window)}
    end
  end

  defp loop(engine, iter \\ 0)

  defp loop(
         %__MODULE__{
           max_iterations: max,
           context: %Context{messages: [_ | _]} = context,
           system_prompt: preface,
           acc: acc
         } = engine,
         iter
       )
       when iter < max do
    preface = build_preface(preface, Map.put(engine, :iteration, iter))
    tools = determine_tools(engine)

    context
    |> append_continue(engine)
    |> put_system_prompt(preface)
    |> fit_context_window(preface)
    |> Provider.reqllm_completion(
      preface: :ignore,
      plural: tools,
      model: engine.model,
      client: engine.provider || :tool,
      usage_callback: engine.usage_callback
    )
    |> case do
      {:ok, %Response{} = response} ->
        content = Response.text(response)

        case Response.tool_calls(response) do
          [_ | _] = calls ->
            calls = Enum.map(calls, &Base.to_tool/1)

            case call_tools(engine, calls, tools) do
              {:ok, tool_msgs, context_msgs, engine} ->
                engine = %{engine | context: Context.append(response.context, context_msgs)}
                {maybe_prepend(content, tool_msgs), engine}

              err -> err
            end

          _ when is_binary(content) ->
            {[callback(engine, {:assistant, content})], %{engine | context: response.context}}

          _ ->
            {:error, "no text or tool results in response"}
        end

      {:error, %ReqLLM.Error.API.Request{status: nil}} = err ->
        # almost certainly a llm provider failure, just retry
        Logger.warning "llm provider failure, retrying: #{inspect(err)}"
        sleep()
        loop(engine, iter + 1)

      {:error, %ReqLLM.Error.API.Request{status: s}} = err when s >= 500 ->
        Logger.error "llm provider HTTP 500, retrying: #{inspect(err)}"
        sleep()
        loop(engine, iter + 1)

      {:error, %ReqLLM.Error.API.Request{status: status, reason: body}} when status >= 400 and status < 500 ->
        {:error, "llm provider HTTP #{status} : #{Console.truncate(body, 200)}"}

      {:error, %ReqLLM.Error.API.Request{reason: reason}} ->
        Logger.warning "llm provider socket closed, retrying: #{inspect(reason)}"
        sleep()
        loop(engine, iter + 1)

      err -> err
    end
    |> then(fn
      {l, engine} when is_list(l) -> finalize_loop(l, engine, acc, iter)
      err -> err
    end)
  end

  defp loop(%__MODULE__{acc: acc}, _), do: {:ok, acc}

  defp finalize_loop(msgs, %__MODULE__{reducer: fun} = engine, acc, iter)
       when is_function(fun, 2) do
    Enum.map(msgs, &msg(&1, :result))
    |> fun.(acc)
    |> case do
      {:halt, res} -> {:ok, res}
      {:messages, [_ | _] = msgs} ->
        loop(%{append_reducer_messages(engine, msgs) | acc: acc}, iter + 1)

      {:message, msg} ->
        loop(%{append_reducer_messages(engine, [msg]) | acc: acc}, iter + 1)

      {:cont, acc} -> loop(%{engine | acc: acc}, iter + 1)
    end
  end

  defp append_continue(
         %Context{messages: [_ | _] = messages} = context,
         %__MODULE__{continue_msg: cont}
       ) do
    case List.last(messages) do
      %ReqLLM.Message{role: :assistant} -> Context.append(context, Context.user(cont))
      _ -> context
    end
  end

  defp append_continue(context, _), do: context

  defp build_preface(str, _) when is_binary(str), do: str
  defp build_preface(fun, engine) when is_function(fun, 1), do: fun.(engine)

  defp append_context(%__MODULE__{context: %Context{} = context} = engine, %Context{} = incoming) do
    %{engine | context: Context.concat(context, incoming)}
  end

  defp append_context(%__MODULE__{context: %Context{} = context} = engine, messages)
       when is_list(messages) do
    %{engine | context: Context.concat(context, Base.reqllm_messages(messages))}
  end

  defp append_reducer_messages(%__MODULE__{context: %Context{} = context} = engine, messages) do
    Enum.reduce(messages, context, fn
      {:tool, content, %{call_id: id, name: name}}, context
      when is_binary(content) and is_binary(id) ->
        Context.append(context, Context.tool_result(id, name, content))

      message, context ->
        Context.append(context, Base.reqllm_messages([message]).messages)
    end)
    |> then(& %{engine | context: &1})
  end

  defp put_system_prompt(%Context{messages: [%ReqLLM.Message{role: :system} | rest]} = context, preface)
    when is_binary(preface), do: %{context | messages: [Context.system(preface) | rest]}
  defp put_system_prompt(%Context{} = context, preface) when is_binary(preface),
    do: Context.prepend(context, Context.system(preface))
  defp put_system_prompt(context, _), do: context

  @spec call_tools(%__MODULE__{}, [Tool.t], [module]) ::
          {:ok, [term], [ReqLLM.Message.t()], t()} | {:error, binary}
  defp call_tools(%__MODULE__{policies: pols} = engine, tools, impls) do
    by_name = Map.new(impls, & {Tool.name(&1), &1})

    Enum.reduce_while(tools, {[], [], engine}, fn
      %Tool{id: id, name: name, arguments: args} = tool, {results, context, engine} ->
        with {:ok, impl} <- Map.fetch(by_name, name),
             {:ok, impl} <- Tool.policy(impl, args, pols),
             {:ok, parsed} <- Tool.validate(impl, args) do
          case Tool.implement(impl, Map.put(parsed, :id, tool)) do
            %EnabledTools{} = enabled ->
              {result, context_msg} =
                tool_result(
                  engine,
                  "enabled tools: #{Enum.join(EnabledTools.enabled(enabled), ", ")}",
                  id,
                  name,
                  args
                )

              {:cont,
               {[result | results], prepend_context_message(context_msg, context),
                %{engine | enabled_tools: enabled}}}

            {:ok, result} ->
              {result, context_msg} = tool_result(engine, result, id, name, args)
              {:cont, {[result | results], prepend_context_message(context_msg, context), engine}}

            err ->
              {result, context_msg} =
                tool_result(
                  engine,
                  "failed to call tool: #{name}, result: #{inspect(err)}",
                  id,
                  name,
                  args
                )

              {:cont, {[result | results], prepend_context_message(context_msg, context), engine}}
          end
        else
          :error ->
            {result, context_msg} =
              tool_result(
                engine,
                "failed to call tool: #{name}, tool not found",
                id,
                name,
                args
              )

            {:cont, {[result | results], prepend_context_message(context_msg, context), engine}}

          {:error, %Ecto.Changeset{} = cs} ->
            {result, context_msg} =
              tool_result(
                engine,
                "failed to call tool: #{name}, errors: #{Enum.join(resolve_changeset(cs), ", ")}",
                id,
                name,
                args
              )

            {:cont, {[result | results], prepend_context_message(context_msg, context), engine}}

          err ->
            {result, context_msg} =
              tool_result(
                engine,
                "failed to call tool: #{name}, result: #{inspect(err)}",
                id,
                name,
                args
              )

            {:cont, {[result | results], prepend_context_message(context_msg, context), engine}}
        end
    end)
    |> then(fn
      {results, context, engine} -> {:ok, Enum.reverse(results), Enum.reverse(context), engine}
      err -> err
    end)
  end

  defp tool_result(engine, result, id, name, args) do
    result = callback(engine, tool_msg(result, id, name, args, engine.tool_fmt))

    case msg(result, :tool) do
      {:tool, content, _} when is_binary(content) ->
        {result, Context.tool_result(id, name, content)}

      _ ->
        {result, nil}
    end
  end

  defp prepend_context_message(nil, messages), do: messages
  defp prepend_context_message(%ReqLLM.Message{} = message, messages), do: [message | messages]

  defp callback(%__MODULE__{callback: cb}, msg) when is_function(cb, 1) do
    cb.(msg)
    msg
  end
  defp callback(_, msg), do: msg

  defp tool_msg(content, id, name, args, fun, attrs \\ %{})
  defp tool_msg(content, id, name, args, _, attrs) when is_binary(content),
    do: {:tool, content, %{call_id: id, name: name, arguments: args, attributes: attrs}}

  defp tool_msg(%{content: content} = msg, id, name, args, _, _),
    do: {:tool, content, %{call_id: id, name: name, arguments: args, attributes: Map.delete(msg, :content)}}

  defp tool_msg(result, id, name, args, fmt, attrs) when is_function(fmt, 1) do
    case fmt.(result) do
      content when is_binary(content) -> {result, {:tool, content, %{call_id: id, name: name, arguments: args, attributes: attrs}}}
      _ -> result
    end
  end

  defp msg({res, {:tool, _, _}}, :result), do: res
  defp msg({_, {:tool, _, _} = tool}, :tool), do: tool
  defp msg(pass, _), do: pass

  defp maybe_prepend(msg, messages) when is_binary(msg) and byte_size(msg) > 0,
    do: [{:assistant, msg} | messages]

  defp maybe_prepend(_, messages), do: messages

  defp trim_messages(total, msgs, window) when total < window, do: msgs
  defp trim_messages(_, [_] = msgs, _), do: msgs
  defp trim_messages(_, [] = msgs, _), do: msgs
  defp trim_messages(total, [msg | rest], window),
    do: trim_messages(total - msg_size(msg), rest, window)

  defp trim_context_messages(messages, window) do
    messages
    |> Enum.reduce(0, &msg_size(&1) + &2)
    |> trim_messages(messages, window)
    |> Enum.drop_while(&match?(%ReqLLM.Message{role: :tool}, &1))
  end

  # @tkn_model "o200k_base"

  defp msg_size(%ReqLLM.Message{} = message) do
    content_size = Enum.sum_by(message.content || [], &content_part_size/1)
    tool_calls_size = Enum.sum_by(message.tool_calls || [], &tool_call_size/1)

    payload_size =
      content_size +
        tool_calls_size +
        value_size(message.name) +
        value_size(message.tool_call_id) +
        encoded_size(message.reasoning_details)

    # ReqLLM does not expose a tokenizer-independent counter. Context windows are
    # token counts, so estimate from the values that providers actually encode
    # rather than the Erlang heap representation of the structs.
    estimate_tokens(payload_size) + 4
  end

  defp msg_size(%{content: content}) when is_binary(content),
    do: estimate_tokens(byte_size(content))

  defp msg_size({_, content}) when is_binary(content),
    do: estimate_tokens(byte_size(content))

  defp msg_size({_, content, args}) when is_binary(content),
    do:
      estimate_tokens(
        byte_size(content) + encoded_size(Map.take(args, [:name, :arguments]))
      )

  defp msg_size(_), do: 0

  defp content_part_size(part) do
    value_size(Map.get(part, :text)) +
      value_size(Map.get(part, :url)) +
      encoded_binary_size(Map.get(part, :data)) +
      value_size(Map.get(part, :file_id)) +
      value_size(Map.get(part, :media_type)) +
      value_size(Map.get(part, :filename))
  end

  defp tool_call_size(%ReqLLM.ToolCall{
         id: id,
         type: type,
         function: %{name: name, arguments: arguments}
       }) do
    value_size(id) + value_size(type) + value_size(name) + value_size(arguments)
  end

  defp tool_call_size(tool_call), do: encoded_size(tool_call)

  defp value_size(value) when is_binary(value), do: byte_size(value)
  defp value_size(_), do: 0

  defp encoded_binary_size(value) when is_binary(value),
    do: div(byte_size(value) * 4 + 2, 3)

  defp encoded_binary_size(_), do: 0

  defp encoded_size(nil), do: 0
  defp encoded_size(value) do
    case Jason.encode(value) do
      {:ok, encoded} -> byte_size(encoded)
      _ -> 0
    end
  end

  defp estimate_tokens(0), do: 0
  defp estimate_tokens(bytes), do: div(bytes + 3, 4)

  defp sleep(), do: :timer.sleep(@sleep + Console.jitter(@sleep))

  defp setup_toolsearch(%__MODULE__{tool_search: true, pre_enable: pre_enable} = engine),
    do: %__MODULE__{engine | enabled_tools: EnabledTools.new(engine.tools, pre_enable)}
  defp setup_toolsearch(engine), do: engine

  defp determine_tools(%__MODULE__{enabled_tools: %EnabledTools{} = enabled}),
    do: [%ToolSearch{enabled: enabled}, %EnableTools{enabled: enabled} | EnabledTools.tools(enabled)]
  defp determine_tools(%__MODULE__{tools: tools}), do: tools
end
