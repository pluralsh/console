defmodule Console.AI.Workbench.Subagents.Base do
  import Console.AI.Agents.Base, only: [publish_absinthe: 2]

  defmacro __using__(_) do
    quote do
      import Console.AI.Workbench.Subagents.Base
      alias Console.AI.Chat.MemoryEngine
    end
  end

  def callback(%{id: id, workbench_job_id: workbench_job_id}, {:content, content}) when is_binary(content),
    do: publish_absinthe(%{activity_id: id, text: content}, workbench_job_progress: "workbench_jobs:#{workbench_job_id}:progress")
  def callback(%{id: id, workbench_job_id: workbench_job_id}, {:tool, content, %{name: name, arguments: args}})
    when is_binary(content) do
    publish_absinthe(%{activity_id: id, tool: name, arguments: args, text: content}, workbench_job_progress: "workbench_jobs:#{workbench_job_id}:progress")
  end
  def callback(_, _), do: :ok

  def last_message(messages, mapper) when is_function(mapper, 1) do
    Enum.reverse(messages)
    |> Enum.find(&match?({:assistant, content} when is_binary(content), &1))
    |> case do
      {:assistant, content} when is_binary(content) -> mapper.(content)
      _ -> mapper.("no reason given for failure")
    end
  end
end
