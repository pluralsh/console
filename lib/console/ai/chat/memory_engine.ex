defmodule Console.AI.Chat.MemoryEngine do
  @moduledoc """
  Performs an agent chat loop entirely in memory.  This allows for reusable agentic behavior w/o being tied to the chat data model
  or any other costly persistence, but with a callback to hook in if desired
  """
  import Console.GraphQl.Helpers, only: [resolve_changeset: 1]
  alias Console.AI.{Provider, Tool}
  alias Console.AI.Chat.Engine

  defstruct [:tools, :system_prompt, :max_iterations, :reducer, messages: [], acc: []]

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

  defp loop(engine, iter \\ 0)
  defp loop(%__MODULE__{max_iterations: max, messages: [_ | _] = messages, system_prompt: preface, acc: acc} = engine, iter) when iter < max do
    messages
    |> Engine.fit_context_window(preface)
    |> Provider.completion(preface: preface, plural: engine.tools)
    |> case do
      {:ok, content} -> [{:assistant, content}]
      {:ok, content, tools} ->
        case call_tools(engine, tools, engine.tools) do
          {:ok, tool_msgs} -> maybe_prepend(content, tool_msgs)
          err -> err
        end
      err -> err
    end
    |> then(fn
      l when is_list(l) ->
        case engine.reducer.(l, acc) do
          {:halt, res} -> {:ok, res}
          {:cont, acc} -> loop(%{engine | acc: acc, messages: messages ++ l}, iter + 1)
        end
      err -> err
    end)
  end
  defp loop(%__MODULE__{acc: acc}, _), do: {:ok, acc}

  @spec call_tools(%__MODULE__{}, [Tool.t], [module]) :: {:ok, [%{role: Provider.sender, content: binary}]} | {:error, binary}
  defp call_tools(_engine, tools, impls) do
    by_name = Map.new(impls, & {&1.name(), &1})
    Enum.reduce_while(tools, [], fn %Tool{id: id, name: name, arguments: args}, acc ->
      with {:ok, impl}    <- Map.fetch(by_name, name),
           {:ok, parsed}  <- Tool.validate(impl, args),
           {:ok, content} <- impl.implement(parsed) do
        {:cont, [tool_msg(content, id, name, args) | acc]}
      else
        :error ->
          {:halt, [tool_msg("failed to call tool: #{name}, tool not found", id, name, args) | acc]}
        {:error, %Ecto.Changeset{} = cs} ->
          {:cont, [tool_msg("failed to call tool: #{name}, errors: #{Enum.join(resolve_changeset(cs), ", ")}", id, name, args) | acc]}
        err ->
          {:halt, [tool_msg("failed to call tool: #{name}, result: #{inspect(err)}", id, name, args) | acc]}
      end
    end)
    |> then(fn
      l when is_list(l) -> {:ok, l}
      err -> err
    end)
  end

  defp tool_msg(content, id, name, args, attrs \\ %{})
  defp tool_msg(content, id, name, args, attrs) when is_binary(content),
    do: {:tool, content, %{call_id: id, name: name, arguments: args, attributes: attrs}}
  defp tool_msg(%{content: content} = msg, id, name, args, _),
    do: {:tool, content, %{call_id: id, name: name, arguments: args, attributes: Map.delete(msg, :content)}}
  defp tool_msg(result, _, _, _, _), do: result

  defp maybe_prepend(msg, messages) when is_binary(msg) and byte_size(msg) > 0, do: [{:assistant, msg} | messages]
  defp maybe_prepend(_, messages), do: messages
end
