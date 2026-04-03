defmodule Console.AI.Workbench.Subagents.Observability do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity, WorkbenchTool}
  alias Console.AI.Tools.Workbench.{ObservabilityResult, Skills, Skill}
  alias Console.AI.Tools.Workbench.Observability.{Metrics, MetricsSearch, Logs, Traces, Time}
  alias Console.AI.Workbench.{Environment, MCP}

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt}, %Environment{} = environment) do
    tools(environment)
    |> MemoryEngine.new(20, system_prompt: system_prompt(prompt: jprompt), acc: %{}, callback: &callback(activity, &1))
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, error: "error running observability subagent: #{inspect(error)}"}
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

  defp tools(%Environment{skills: skills, tools: tools, job: job}) do
    obs_tools(tools)
    |> Enum.concat(MCP.expand_tools(Environment.subagent_tools(tools, :observability), job))
    |> Enum.concat([
      %Skills{skills: skills},
      %Skill{skills: skills},
      ObservabilityResult,
      Time
    ])
  end

  @allowed_tools MapSet.new(~w(metrics logs traces)a)

  defp obs_tools(tools) do
    Enum.map(tools, &elem(&1, 1))
    |> Enum.filter(fn
      %WorkbenchTool{categories: [_ | _] = categories} -> MapSet.subset?(MapSet.new(categories), @allowed_tools)
      _ -> false
    end)
    |> Enum.flat_map(fn
      %WorkbenchTool{categories: [_ | _] = categories} = tool ->
        Enum.flat_map(categories, fn c -> to_tool(tool, c) end)
      _ -> []
    end)
  end

  defp to_tool(%WorkbenchTool{} = tool, :metrics), do: [%Metrics{tool: tool}, %MetricsSearch{tool: tool}]
  defp to_tool(%WorkbenchTool{} = tool, :logs), do: [%Logs{tool: tool}]
  defp to_tool(%WorkbenchTool{} = tool, :traces), do: [%Traces{tool: tool}]
  defp to_tool(_, _), do: []

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "observability.md.eex"]), [:assigns])
end
