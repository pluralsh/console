defmodule Console.AI.Workbench.Subagents.Observability do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{Workbench, WorkbenchJob, WorkbenchJobActivity, WorkbenchTool, User}
  alias Console.AI.Tools.Workbench.{ObservabilityResult, Skills, Skill, Lua, History, Infrastructure.PodLogs, Scratchpad}
  alias Console.AI.Tools.Workbench.Observability.{Metrics, MetricsSearch, MetricsLabelSearch, Logs, Traces, Plrl}
  alias Console.AI.Tools.Workbench.Integration.Sentry.Tools, as: SentryTools
  alias Console.AI.Workbench.{Environment, MCP}
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt, user: user} = job, %Environment{} = environment) do
    tools = tools(environment, user)

    MemoryEngine.new(tools, 50,
      engine_opts(job) ++ [
        system_prompt: &String.trim(system_prompt(prompt: jprompt, engine: &1)),
        acc: %{},
        callback: &callback(activity, &1),
        tool_search: length(tools) > 10,
        pre_enable: [ObservabilityResult, %Skills{} ,%Skill{}],
        continue_msg: "looks like we aren't done, let's continue and if you're done just call observability_result to wrap up"
      ]
    )
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, result: %{error: "error running observability subagent: #{inspect(error)}"}}
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%ObservabilityResult{}, &1)) do
      %ObservabilityResult{} = result -> {:halt, %{
        status: :successful,
        result: Console.mapify(result) |> Map.drop([:id])
      }}
      _ -> last_message(messages, & {:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  def tools(%Environment{skills: skills, tools: tools, job: job, activities: activities}, user) do
    skills = Environment.subagent_skills(skills, :observability)

    obs_tools(tools)
    |> Enum.concat(MCP.expand_tools(Environment.subagent_tools(tools, :observability), job))
    |> Enum.concat(plrl_log_tools(job))
    |> Enum.concat(plrl_metric_tools(job))
    |> Enum.concat(pod_logs_tools(job, user))
    |> Enum.concat([
      %Skills{skills: skills},
      %Skill{skills: skills},
      Scratchpad,
      ObservabilityResult,
      Lua,
      %History{job: job, activities: activities}
    ])
  end

  defp plrl_log_tools(%WorkbenchJob{user: user, workbench: %Workbench{configuration: %{observability: %{logs: true}}}}) do
    [
      %Plrl.Logs{user: user},
      %Plrl.LogsAggregate{user: user},
      %Plrl.LogLabels{user: user}
    ]
  end
  defp plrl_log_tools(_), do: []

  defp pod_logs_tools(%Workbench{configuration: %{infrastructure: %{pod_logs: true}}}, %User{} = user),
    do: [%PodLogs{user: user}]
  defp pod_logs_tools(_, _), do: []

  defp plrl_metric_tools(%WorkbenchJob{workbench: %Workbench{configuration: %{observability: %{metrics: true}}}}),
    do: [Plrl.Metrics, Plrl.MetricsSearch, Plrl.MetricsLabelSearch]
  defp plrl_metric_tools(_), do: []

  @allowed_tools MapSet.new(~w(metrics logs traces error_tracking)a)

  defp obs_tools(tools) do
    Enum.map(tools, &elem(&1, 1))
    |> Enum.filter(fn
      %WorkbenchTool{tool: t, categories: [_ | _] = categories} when t != :mcp ->
        MapSet.subset?(MapSet.new(categories), @allowed_tools)
      _ -> false
    end)
    |> Enum.flat_map(fn
      %WorkbenchTool{tool: :sentry} = tool -> SentryTools.expand(tool)
      %WorkbenchTool{categories: [_ | _] = categories} = tool ->
        Enum.flat_map(categories, fn c -> to_tool(tool, c) end)
      _ -> []
    end)
  end

  defp to_tool(%WorkbenchTool{} = tool, :metrics), do: [%Metrics{tool: tool}, %MetricsSearch{tool: tool}, %MetricsLabelSearch{tool: tool}]
  defp to_tool(%WorkbenchTool{} = tool, :logs), do: [%Logs{tool: tool}]
  defp to_tool(%WorkbenchTool{} = tool, :traces), do: [%Traces{tool: tool}]
  defp to_tool(_, _), do: []

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "observability.md.eex"]), [:assigns])
end
