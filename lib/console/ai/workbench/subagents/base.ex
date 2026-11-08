defmodule Console.AI.Workbench.Subagents.Base do
  alias Console.Repo
  alias Console.AI.VectorStore
  alias Console.AI.Workbench.{Activity, Environment, MCP, Tools}
  alias Console.Deployments.Workbenches
  alias Console.Schema.{AgentRun, WorkbenchJobThought, WorkbenchJob, WorkbenchJobActivity, WorkbenchTool}
  alias Console.AI.Tools.Workbench.{Context, Skills, Skill, ListKnowledge, Knowledge, KnowledgeUsed}
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

  @doc """
  User turn sent after a text-only reply. Kept neutral so it doesn't push the subagent to keep
  working when it should hand back its result.
  """
  def cont_msg(result_tools \\ Console.AI.Tools.Workbench.Result.name()) do
    "Decide the next step based on the work so far. If the delegated task is done, or further work " <>
      "wouldn't meaningfully change the result, call #{tool_list(result_tools)} now. Otherwise, call the tool " <>
      "for the next step that's still needed. Don't repeat work that has already been done."
  end

  defp tool_list(tool) when is_binary(tool), do: "`#{tool}`"
  defp tool_list([tool]), do: tool_list(tool)
  defp tool_list([_ | _] = tools) do
    {rest, [last]} = tools |> Enum.map(&tool_list/1) |> Enum.split(-1)
    Enum.join(rest, ", ") <> " or " <> last
  end

  def if_vector_store_enabled(tools) when is_list(tools) do
    case VectorStore.enabled?() do
      true -> tools
      _ -> []
    end
  end
  def if_vector_store_enabled(tool), do: if_vector_store_enabled([tool])

  def callback(%WorkbenchJobActivity{} = activity, %Environment{} = environment, {:tool, content, %{} = tool})
    when is_binary(content),
    do: save_thought(activity, environment, content, tool)
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
    %{name: name, arguments: args, attributes: %{} = attributes} = tool_call
  ) when is_binary(content) and is_binary(activity_id) do
    %WorkbenchJobThought{activity_id: activity_id, activity: activity}
    |> WorkbenchJobThought.changeset(%{
      content: content,
      attributes: attributes,
      tool_name: name,
      tool_args: if(is_map(args), do: args),
      tool_call: Map.take(tool_call, [:call_id, :name, :arguments]),
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
  Read-only context, skill, and knowledge tools shared by the orchestrator and every subagent.
  Includes the live workbench context, listing/reading skills and knowledge, and recording
  knowledge usage.
  """
  def skill_knowledge_tools(%WorkbenchJob{} = job, skills) do
    [
      %Context{job: job},
      %Skills{skills: skills},
      %Skill{skills: skills}
      | knowledge_tools([%ListKnowledge{job: job}, %Knowledge{job: job}, %KnowledgeUsed{job: job}])
    ]
  end

  @doc """
  MCP tools from workbench tools in the `:search` category (eg web search), wired into the orchestrator and
  every subagent. Tools `agent` already receives through its own category routing are skipped to avoid
  duplicate tool names.
  """
  def search_tools(%Environment{tools: tools, job: %WorkbenchJob{} = job}, agent)
      when is_map(tools) or is_list(tools) do
    Environment.subagent_tools(tools, :search)
    |> Enum.reject(&Environment.subagent_tool?(&1, agent))
    |> MCP.expand_tools(job)
  end
  def search_tools(_, _), do: []

  def skill_knowledge_pre_enable do
    [%Context{}, %Skills{}, %Skill{} | knowledge_tools([%ListKnowledge{}, %Knowledge{}, %KnowledgeUsed{}])]
  end

  @doc """
  The workbench knowledge base is superseded by `/workbench/knowledge` in the workbench filesystem, so its
  tools are only offered when no filesystem is configured.
  """
  def knowledge_tools(tools) do
    case Console.PseudoFS.enabled?() do
      true -> []
      false -> tools
    end
  end
end
