defmodule Console.AI.Chat.MemoryEngine do
  @moduledoc """
  Performs an agent chat loop entirely in memory.  This allows for reusable agentic behavior w/o being tied to the chat data model
  or any other costly persistence, but with a callback to hook in if desired
  """
  import Console.GraphQl.Helpers, only: [resolve_changeset: 1]
  alias Console.AI.{Provider, Tool}
  alias Console.AI.Chat.Engine

  defstruct [:tools, :system_prompt, :max_iterations, :reducer, :callback, messages: [], acc: [], tool_fmt: &Console.identity/1]

  def new(tools, max_iterations, opts \\ []) when is_integer(max_iterations) and max_iterations > 0 do
    struct(__MODULE__, Keyword.merge(opts, [tools: tools, max_iterations: max_iterations]))
  end

  def run(%__MODULE__{} = engine, [_ | _] = messages) do
    engine = %__MODULE__{engine | reducer: fn l, acc -> {:cont, l ++ acc} end}
    put_in(engine.messages, engine.messages ++ messages)
    |> loop()
  end

  @doc """
  Reduces the engine by running a completion and then calling the reducer function with the result.

  The reducer function is a two-arity function of messages and accumulator.  It should return a tuple of {:halt, result} if the reduction should halt, or the new accumulator if the reduction should continue.
  """
  def reduce(%__MODULE__{} = engine, [_ | _] = messages, reducer) when is_function(reducer, 2) do
    engine = %__MODULE__{engine | reducer: reducer}
    put_in(engine.messages, engine.messages ++ messages)
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

  def fit_context_window(msgs, preface) do
    Enum.reduce(msgs, byte_size(preface), &msg_size(&1) + &2)
    |> trim_messages(msgs, Provider.context_window(:tool))
  end

  defp loop(engine, iter \\ 0)
  defp loop(%__MODULE__{max_iterations: max, messages: [_ | _] = messages, system_prompt: preface, acc: acc} = engine, iter) when iter < max do
    preface = build_preface(preface, Map.put(engine, :iteration, iter))

    messages
    |> Enum.map(&msg(&1, :tool))
    |> fit_context_window(preface)
    |> Provider.completion(preface: preface, plural: engine.tools, client: :tool)
    |> case do
      {:ok, content} -> [callback(engine, {:assistant, content})]
      {:ok, content, tools} ->
        case call_tools(engine, tools, engine.tools) do
          {:ok, tool_msgs} -> maybe_prepend(content, tool_msgs)
          err -> err
        end
      err -> err
    end
    |> then(fn
      l when is_list(l) -> finalize_loop(l, engine, acc, iter)
      err -> err
    end)
  end
  defp loop(%__MODULE__{acc: acc}, _), do: {:ok, acc}

  defp finalize_loop(msgs, %__MODULE__{reducer: fun, messages: messages} = engine, acc, iter) when is_function(fun, 2) do
    Enum.map(msgs, &msg(&1, :result))
    |> fun.(acc)
    |> case do
      {:halt, res} -> {:ok, res}
      {:message, msg} ->loop(%{engine | acc: acc, messages: messages ++ [msg]}, iter + 1)
      {:cont, acc} -> loop(%{engine | acc: acc, messages: messages ++ msgs}, iter + 1)
    end
  end

  defp build_preface(str, _) when is_binary(str), do: str
  defp build_preface(fun, engine) when is_function(fun, 1), do: fun.(engine)

  @spec call_tools(%__MODULE__{}, [Tool.t], [module]) :: {:ok, [%{role: Provider.sender, content: binary}]} | {:error, binary}
  defp call_tools(engine, tools, impls) do
    by_name = Map.new(impls, & {Tool.name(&1), &1})
    Enum.reduce_while(tools, [], fn %Tool{id: id, name: name, arguments: args} = tool, acc ->
      with {:ok, impl}    <- Map.fetch(by_name, name),
           {:ok, parsed}  <- Tool.validate(impl, args),
           {:ok, content} <- Tool.implement(impl, Map.put(parsed, :id, tool)) do
        {:cont, [callback(engine, tool_msg(content, id, name, args, engine.tool_fmt)) | acc]}
      else
        :error ->
          {:halt, [callback(engine, tool_msg("failed to call tool: #{name}, tool not found", id, name, args, engine.tool_fmt)) | acc]}
        {:error, %Ecto.Changeset{} = cs} ->
          {:cont, [callback(engine, tool_msg("failed to call tool: #{name}, errors: #{Enum.join(resolve_changeset(cs), ", ")}", id, name, args, engine.tool_fmt)) | acc]}
        err ->
          {:halt, [callback(engine, tool_msg("failed to call tool: #{name}, result: #{inspect(err)}", id, name, args, engine.tool_fmt)) | acc]}
      end
    end)
    |> then(fn
      l when is_list(l) -> {:ok, l}
      err -> err
    end)
  end

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

  defp maybe_prepend(msg, messages) when is_binary(msg) and byte_size(msg) > 0, do: [{:assistant, msg} | messages]
  defp maybe_prepend(_, messages), do: messages

  defp trim_messages(total, msgs, window) when total < window, do: msgs
  defp trim_messages(_, [_] = msgs, _), do: msgs
  defp trim_messages(_, [] = msgs, _), do: msgs
  defp trim_messages(total, [msg | rest], window),
    do: trim_messages(total - msg_size(msg), rest, window)

  # @tkn_model "o200k_base"

  defp msg_size(%{content: content}) when is_binary(content), do: byte_size(content)
  defp msg_size({_, content}), do: byte_size(content)
  defp msg_size({_, content, args}), do: byte_size(content <> Jason.encode!(Map.take(args, [:name, :arguments])))
  defp msg_size(_), do: 0
end
