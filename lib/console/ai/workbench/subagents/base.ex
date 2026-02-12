defmodule Console.AI.Workbench.Subagents.Base do
  defmacro __using__(_) do
    quote do
      import Console.AI.Workbench.Subagents.Base
      alias Console.AI.Chat.MemoryEngine
    end
  end

  def last_message(messages, mapper) when is_function(mapper, 1) do
    Enum.reverse(messages)
    |> Enum.find(&match?({:assistant, content} when is_binary(content), &1))
    |> case do
      {:assistant, content} when is_binary(content) -> mapper.(content)
      _ -> mapper.("no reason given for failure")
    end
  end
end
