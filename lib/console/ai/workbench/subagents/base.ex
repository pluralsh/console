defmodule Console.AI.Workbench.Subagents.Base do
  import Console.AI.Agents.Base, only: [publish_absinthe: 2]
  alias Console.Repo
  alias Console.AI.Stream
  alias Console.Schema.{AgentRun, WorkbenchJobThought, WorkbenchJob, WorkbenchJobActivity}

  defmacro __using__(_) do
    quote do
      import Console.AI.Workbench.Subagents.Base
      alias Console.AI.Chat.MemoryEngine
      alias Console.Repo
    end
  end

  def drop_empty(%{} = map) do
    Enum.filter(map, fn
      {_, nil} -> false
      {_, ""} -> false
      {_, []} -> false
      _ -> true
    end)
    |> Map.new()
  end

  def stream_callbacks(%WorkbenchJob{id: id}) do
    Stream.stream_callbacks(
      on_result: &callback(%{text: &1}, workbench_text_stream: "workbench_jobs:#{id}:text_stream"),
      on_thinking: &callback(%{text: &1}, workbench_text_stream: "workbench_jobs:#{id}:text_stream")
    )
  end

  def stream_callbacks(%WorkbenchJobActivity{workbench_job_id: jid, id: id}) do
    Stream.stream_callbacks(
      on_result: &callback(%{text: &1, activity_id: id}, workbench_text_stream: "workbench_jobs:#{jid}:text_stream"),
      on_thinking: &callback(%{text: &1, activity_id: id}, workbench_text_stream: "workbench_jobs:#{jid}:text_stream")
    )
  end

  def callback(%{id: id, workbench_job_id: workbench_job_id}, {:content, content}) when is_binary(content),
    do: publish_absinthe(%{activity_id: id, text: content}, workbench_job_progress: "workbench_jobs:#{workbench_job_id}:progress")
  def callback(%{id: id, workbench_job_id: workbench_job_id}, {:tool, content, %{name: name, arguments: args} = tool})
    when is_binary(content) do
    save_thought(id, content, tool)
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

  @spec poll_run(AgentRun.t, integer) :: {:failed | :timeout | :success, AgentRun.t}
  def poll_run(run, iter \\ 0)
  def poll_run(%AgentRun{} = run, iters) when iters >= 60 * 6, do: {:timeout, run}
  def poll_run(%AgentRun{mode: :write, pull_requests: [_ | _]} = run, _), do: {:success, run}
  def poll_run(%AgentRun{mode: :analyze, analysis: %AgentRun.Analysis{}} = run, _), do: {:success, run}
  def poll_run(%AgentRun{status: :successful} = run, _), do: {:success, run}
  def poll_run(%AgentRun{status: s} = run, _) when s in [:failed, :cancelled], do: {:failed, run}

  def poll_run(%AgentRun{id: id}, iter) do
    jitter_sleep()

    Console.Repo.get(AgentRun, id)
    |> Repo.preload([:pull_requests])
    |> poll_run(iter + 1)
  end

  def save_thought(activity_id, content, %{name: name, arguments: args, attributes: %{} = attributes})
      when is_binary(content) and is_binary(activity_id) do
    %WorkbenchJobThought{activity_id: activity_id}
    |> WorkbenchJobThought.changeset(%{
      content: content,
      attributes: attributes,
      tool_name: name,
      tool_args: args
    })
    |> Repo.insert()
  end
  def save_thought(_, _, _), do: :ok

  defp jitter_sleep() do
    time = :timer.seconds(5)
    :timer.sleep(time + Console.jitter(time))
  end
end
