defmodule Console.AI.Agents.Subagents.Utils do
  alias Console.AI.Stream

  def publish_thought(tool_id, {:assistant, content}) when is_binary(tool_id),
    do: Stream.thought(tool_id, content)
  def publish_thought(tool_id, {:tool, _, %{name: name}}) when is_binary(tool_id),
    do: Stream.thought(tool_id, "calling tool #{name}")
  def publish_thought(_, _), do: :ok
end
