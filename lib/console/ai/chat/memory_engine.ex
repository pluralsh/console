defmodule Console.AI.Chat.MemoryEngine do
  @moduledoc """
  Performs an agent chat loop entirely in memory.  This allows for reusable agentic behavior w/o being tied to the chat data model
  or any other costly persistence, but with a callback to hook in if desired
  """
  import Console.GraphQl.Helpers, only: [resolve_changeset: 1]
  alias Console.AI.Provider.Base
  alias Console.AI.{Provider, Tool}
  alias Console.AI.Chat.{EnabledTools, Thread}
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
    :thread,
    :summarizer,
    :last_system,
    compaction_opts: [],
    continue_msg: "looks like we aren't done let's continue",
    context: %Context{messages: [], tools: []},
    pre_enable: [],
    policies: [],
    acc: [],
    tool_fmt: &Console.identity/1,
    tool_search: false,
    return_context: false,
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

  @doc """
  Reduces the engine from a ReqLLM context and returns both the reduction and the
  canonical context produced by the run.
  """
  def reduce_with_context(
        %__MODULE__{} = engine,
        %Context{messages: [_ | _]} = context,
        reducer
      )
      when is_function(reducer, 2) do
    engine =
      setup_toolsearch(%__MODULE__{
        engine
        | reducer: reducer,
          return_context: true
      })

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
           thread: %Thread{} = thread,
           system_prompt: preface,
           acc: acc
         } = engine,
         iter
       )
       when iter < max do
    preface = build_preface(preface, Map.put(engine, :iteration, iter))
    tools = determine_tools(engine)
    reserved = system_tokens(preface)

    thread =
      thread
      |> append_continue(engine)
      |> Thread.compact(reserved: reserved, summarizer: summarizer(engine), summary_window: fn -> Provider.context_window(:default) end)

    engine = %{engine | thread: thread, last_system: preface}
    estimated = Thread.tokens(thread) + reserved

    thread
    |> request_context(preface)
    |> Provider.reqllm_completion(
      preface: :ignore,
      plural: tools,
      model: engine.model,
      client: engine.provider || :tool,
      stateless: true,
      usage_callback: engine.usage_callback
    )
    |> case do
      {:ok, %Response{} = response} ->
        content = Response.text(response)
        engine = calibrate(engine, response, estimated)

        case Response.tool_calls(response) do
          [_ | _] = calls ->
            calls = Enum.map(calls, &Base.to_tool/1)

            case call_tools(engine, calls, tools) do
              {:ok, tool_msgs, context_msgs, engine} ->
                engine = %{engine | thread: Thread.append(engine.thread, [assistant_message(response) | context_msgs])}
                {maybe_prepend(content, tool_msgs), engine}

              err -> err
            end

          _ when is_binary(content) ->
            {[callback(engine, {:assistant, content})], %{engine | thread: Thread.append(engine.thread, assistant_message(response))}}

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
  defp loop(%__MODULE__{acc: acc} = engine, _), do: finish(engine, acc)

  defp finalize_loop(msgs, %__MODULE__{reducer: fun} = engine, acc, iter)
       when is_function(fun, 2) do
    Enum.map(msgs, &msg(&1, :result))
    |> fun.(acc)
    |> case do
      {:halt, res} -> finish(engine, res)
      {:messages, [_ | _] = msgs} ->
        loop(%{append_reducer_messages(engine, msgs) | acc: acc}, iter + 1)

      {:message, msg} ->
        loop(%{append_reducer_messages(engine, [msg]) | acc: acc}, iter + 1)

      {:cont, acc} -> loop(%{engine | acc: acc}, iter + 1)
    end
  end

  defp append_continue(%Thread{} = thread, %__MODULE__{continue_msg: cont}) do
    case Thread.last_role(thread) do
      :assistant -> Thread.append(thread, Context.user(cont))
      _ -> thread
    end
  end

  defp request_context(%Thread{} = thread, preface),
    do: put_system_prompt(Context.new(Thread.to_messages(thread)), preface)

  defp assistant_message(%Response{message: %ReqLLM.Message{} = message}), do: message
  defp assistant_message(%Response{context: %Context{messages: messages}}), do: List.last(messages)

  defp calibrate(%__MODULE__{thread: thread} = engine, %Response{} = response, estimated) do
    case Response.usage(response) do
      %{input_tokens: observed} -> %{engine | thread: Thread.calibrate(thread, estimated, observed)}
      _ -> engine
    end
  end

  defp summarizer(%__MODULE__{summarizer: fun}) when is_function(fun, 1), do: fun
  # summaries use the default client's base model rather than the engine's (usually pricier) tool model
  defp summarizer(%__MODULE__{compaction_opts: opts}) do
    fn transcript ->
      Provider.completion([{:user, transcript}], Keyword.merge([preface: Thread.compaction_prompt()], opts))
    end
  end

  defp system_tokens(preface) when is_binary(preface), do: Thread.estimate_tokens(byte_size(preface)) + 4
  defp system_tokens(_), do: 0

  defp finish(%__MODULE__{return_context: true, thread: %Thread{} = thread, last_system: preface}, result),
    do: {:ok, {result, request_context(thread, preface)}}
  defp finish(_, result), do: {:ok, result}

  defp build_preface(str, _) when is_binary(str), do: str
  defp build_preface(fun, engine) when is_function(fun, 1), do: fun.(engine)

  defp append_context(%__MODULE__{context: %Context{} = context} = engine, %Context{} = incoming),
    do: with_thread(%{engine | context: Context.concat(context, incoming)})

  defp append_context(%__MODULE__{context: %Context{} = context} = engine, messages)
       when is_list(messages),
       do: with_thread(%{engine | context: Context.concat(context, Base.reqllm_messages(messages))})

  defp with_thread(%__MODULE__{context: %Context{messages: messages}} = engine),
    do: %{engine | thread: Thread.from_messages(messages, Provider.context_window(:tool))}

  defp append_reducer_messages(%__MODULE__{thread: %Thread{} = thread} = engine, messages) do
    Enum.reduce(messages, thread, fn
      {:tool, content, %{call_id: id, name: name}}, thread
      when is_binary(content) and is_binary(id) ->
        Thread.append(thread, Context.tool_result(id, name, content))

      message, thread ->
        Thread.append(thread, Base.reqllm_messages([message]).messages)
    end)
    |> then(& %{engine | thread: &1})
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

  defp msg_size(%ReqLLM.Message{} = message), do: Thread.message_tokens(message)

  defp msg_size(%{content: content}) when is_binary(content),
    do: Thread.estimate_tokens(byte_size(content))

  defp msg_size({_, content}) when is_binary(content),
    do: Thread.estimate_tokens(byte_size(content))

  defp msg_size({_, content, args}) when is_binary(content),
    do: Thread.estimate_tokens(byte_size(content) + Thread.encoded_size(Map.take(args, [:name, :arguments])))

  defp msg_size(_), do: 0

  defp sleep(), do: :timer.sleep(@sleep + Console.jitter(@sleep))

  defp setup_toolsearch(%__MODULE__{tool_search: true, pre_enable: pre_enable} = engine),
    do: %__MODULE__{engine | enabled_tools: EnabledTools.new(engine.tools, pre_enable)}
  defp setup_toolsearch(engine), do: engine

  defp determine_tools(%__MODULE__{enabled_tools: %EnabledTools{} = enabled}),
    do: [%ToolSearch{enabled: enabled}, %EnableTools{enabled: enabled} | EnabledTools.tools(enabled)]
  defp determine_tools(%__MODULE__{tools: tools}), do: tools
end
