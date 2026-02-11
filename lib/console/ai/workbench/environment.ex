defmodule Console.AI.Workbench.Environment do
  alias Console.Schema.{WorkbenchJob, Workbench, WorkbenchTool}
  alias Console.AI.Workbench.Skill

  @type t :: %__MODULE__{
    job: WorkbenchJob.t,
    tools: %{binary => WorkbenchTool.t},
    skills: %{binary => Skill.t}
  }

  defguardp is_map_or_list(m) when is_map(m) or is_list(m)

  defstruct [:job, :tools, :skills]

  def new(%WorkbenchJob{} = job, tools, skills) when is_map_or_list(tools) and is_map_or_list(skills) do
    %__MODULE__{
      job: job,
      tools: to_map(tools),
      skills: to_map(skills)
    }
    |> save()
  end

  def subagents(%WorkbenchJob{workbench: %Workbench{tools: tools} = bench}) do
    tool_agents(tools)
    |> Enum.concat(coding_agents(bench))
    |> Enum.concat(infra_agents(bench))
  end

  defp to_map(m) when is_map(m), do: m
  defp to_map(l) when is_list(l), do: Map.new(l, & {&1.name, &1})

  def upsert(fields), do: upsert(environment(), fields)

  def upsert(%__MODULE__{} = environment, fields) when is_list(fields) or is_map(fields) do
    job = fields[:job] || environment.job
    tools = fields[:tools] || environment.tools
    skills = fields[:skills] || environment.skills

    new(job, tools, skills)
  end

  defp save(%__MODULE__{} = environment) do
    Enum.each(environment.tools, fn {_, tool} -> save_tool(tool) end)
    Enum.each(environment.skills, fn {_, skill} -> save_skill(skill) end)
    save_job(environment.job)
    save_environment(environment)
    environment
  end

  def tool(name), do: Process.get({__MODULE__, :tool, name})
  def job(), do: Process.get({__MODULE__, :job})
  def skill(name), do: Process.get({__MODULE__, :skill, name})
  def environment(), do: Process.get({__MODULE__, :environment})

  def save_environment(%__MODULE__{} = environment), do: Process.put({__MODULE__, :environment}, environment)

  defp save_tool(%WorkbenchTool{name: name} = tool), do: Process.put({__MODULE__, :tool, name}, tool)

  defp save_job(%WorkbenchJob{} = job), do: Process.put({__MODULE__, :job}, job)

  defp save_skill(%Skill{name: name} = skill), do: Process.put({__MODULE__, :skill, name}, skill)

  defp coding_agents(%Workbench{agent_runtime_id: id}) when is_binary(id), do: [:coding]
  defp coding_agents(_), do: []

  defp infra_agents(%Workbench{configuration: %{infrastructure: %{services: s, stacks: st, kubernetes: k}}}) do
    case (s || st || k) do
      true -> [:infrastructure]
      _ -> []
    end
  end
  defp infra_agents(_), do: []

  defp tool_agents(tools) do
    Enum.flat_map(tools, fn
      {_, %{categories: c}} when is_list(c) -> c
      _ -> []
    end)
    |> Enum.map(fn
      :metrics     -> :observability
      :logs        -> :observability
      :integration -> :integration
      :ticketing   -> :integration
      _            -> nil
    end)
    |> Enum.filter(& &1)
    |> Enum.uniq()
  end
end
