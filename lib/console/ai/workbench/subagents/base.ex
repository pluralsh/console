defmodule Console.AI.Workbench.Subagents.Base do
  import Console.AI.Agents.Base, only: [publish_absinthe: 2]
  alias Console.Repo
  alias Console.AI.{Stream, VectorStore}
  alias Console.AI.Workbench.{Activity, Environment, Tools}
  alias Console.Deployments.Workbenches
  alias Console.Schema.{AgentRun, WorkbenchJobThought, WorkbenchJob, WorkbenchJobActivity, WorkbenchTool}
  alias Console.AI.Tools.Workbench.{Skills, Skill, ListKnowledge, Knowledge, KnowledgeUsed}
  require Logger

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

  def cont_msg(), do: "looks like we aren't done, let's continue and if you're done just call subagent_result to wrap up"

  def if_vector_store_enabled(tools) when is_list(tools) do
    case VectorStore.enabled?() do
      true -> tools
      _ -> []
    end
  end
  def if_vector_store_enabled(tool), do: if_vector_store_enabled([tool])

  def stream_callbacks(%WorkbenchJob{id: id}) do
    Stream.stream_callbacks(
      on_result: &publish_absinthe(%{text: &1}, workbench_text_stream: "workbench_jobs:#{id}:text_stream"),
      on_thinking: &publish_absinthe(%{text: &1}, workbench_text_stream: "workbench_jobs:#{id}:text_stream")
    )
  end

  def stream_callbacks(%WorkbenchJobActivity{workbench_job_id: jid, id: id}) do
    Stream.stream_callbacks(
      on_result: &publish_absinthe(%{text: &1, activity_id: id}, workbench_text_stream: "workbench_jobs:#{jid}:text_stream"),
      on_thinking: &publish_absinthe(%{text: &1, activity_id: id}, workbench_text_stream: "workbench_jobs:#{jid}:text_stream")
    )
  end

  def callback(%WorkbenchJobActivity{id: id, workbench_job_id: job_id}, _, {kind, content})
    when kind in [:content, :assistant] and is_binary(content),
    do: publish_absinthe(%{activity_id: id, text: content}, workbench_job_progress: "workbench_jobs:#{job_id}:progress")
  def callback(%WorkbenchJobActivity{id: id, workbench_job_id: job_id} = activity, %Environment{} = environment, {:tool, content, %{name: name, arguments: args} = tool})
    when is_binary(content) do
    save_thought(activity, environment, content, tool)
    publish_absinthe(%{
      activity_id: id,
      tool: name,
      arguments: args,
      text: content
    }, workbench_job_progress: "workbench_jobs:#{job_id}:progress")
  end
  def callback(_, _, _), do: :ok

  def last_message(messages, mapper) when is_function(mapper, 1) do
    Enum.reverse(messages)
    |> Enum.find(&match?({:assistant, content} when is_binary(content), &1))
    |> case do
      {:assistant, content} when is_binary(content) and byte_size(content) > 0 -> mapper.(content)
      _ -> mapper.("no reason given for failure")
    end
  end

  @spec poll_run(AgentRun.t()) :: {:failed | :timeout | :success, AgentRun.t()}
  def poll_run(%AgentRun{} = run), do: Activity.await_run(run)

  def save_thought(
    %WorkbenchJobActivity{id: activity_id} = activity,
    %Environment{} = environment,
    content,
    %{name: name, arguments: args, attributes: %{} = attributes}
  ) when is_binary(content) and is_binary(activity_id) do
    %WorkbenchJobThought{activity_id: activity_id, activity: activity}
    |> WorkbenchJobThought.changeset(%{
      content: content,
      attributes: attributes,
      tool_name: name,
      tool_args: if(is_map(args), do: args),
      tool_id: thought_tool_id(environment, name)
    })
    |> Repo.insert()
    |> Workbenches.notify(:create)
  end
  def save_thought(_, _, _, _), do: :ok

  defp thought_tool_id(%Environment{tool_index: index}, name) when is_binary(name) do
    case Tools.get(index || %{}, name) do
      {_, %WorkbenchTool{id: id}} -> id
      _ -> nil
    end
  end
  defp thought_tool_id(_, _), do: nil

  def log_error({:error, error}, context) do
    Logger.error("#{context}: #{inspect(error)}")
    {:error, error}
  end
  def log_error(pass, _), do: pass

  @doc """
  Read-only skill and knowledge tools shared by the orchestrator and every subagent.
  Includes listing/reading skills and knowledge, plus recording knowledge usage.
  """
  def skill_knowledge_tools(%WorkbenchJob{} = job, skills) do
    [
      %Skills{skills: skills},
      %Skill{skills: skills},
      %ListKnowledge{job: job},
      %Knowledge{job: job},
      %KnowledgeUsed{job: job}
    ]
  end

  def skill_knowledge_pre_enable do
    [%Skills{}, %Skill{}, %ListKnowledge{}, %Knowledge{}, %KnowledgeUsed{}]
  end
end
