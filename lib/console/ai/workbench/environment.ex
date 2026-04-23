defmodule Console.AI.Workbench.Environment do
  alias Console.Schema.{WorkbenchJob, Workbench, WorkbenchTool, WorkbenchJobActivity, User}
  alias Console.AI.Workbench.{Skill, Skills.Builtins}

  @type t :: %__MODULE__{
    user: User.t,
    job: WorkbenchJob.t,
    tools: %{binary => WorkbenchTool.t},
    skills: %{binary => Skill.t},
    activities: [WorkbenchJobActivity.t]
  }

  defguardp is_map_or_list(m) when is_map(m) or is_list(m)

  defstruct [:job, :tools, :skills, :activities, :user]

  def new(%WorkbenchJob{} = job, tools, skills) when is_map_or_list(tools) and is_map_or_list(skills) do
    %__MODULE__{
      user: job.user,
      job: job,
      tools: to_map(tools),
      skills: to_map(skills)
    }
    |> save()
  end

  def with_builtins(skills) when is_map(skills) do
    Builtins.builtins()
    |> Map.new(fn %Skill{name: name} = skill -> {name, skill} end)
    |> Map.merge(skills)
  end

  def subagents(%WorkbenchJob{workbench: %Workbench{tools: tools} = bench}) do
    tool_agents(tools)
    |> Enum.concat(coding_agents(bench))
    |> Enum.concat(infra_agents(bench))
  end

  def categories(%WorkbenchJob{workbench: %Workbench{tools: tools}}) when is_list(tools) do
    Enum.flat_map(tools, & (&1.categories || []))
    |> Enum.uniq()
  end
  def categories(_), do: []

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

  def subagent_tools(tools, subagent) when is_list(tools) and is_atom(subagent),
    do: Enum.filter(tools, &subagent_tool?(&1, subagent))
  def subagent_tools(%{} = tools, subagent), do: subagent_tools(Map.values(tools), subagent)

  def subagent_tool?(%WorkbenchTool{categories: categories}, subagent) when is_list(categories),
    do: Enum.any?(categories, & category_to_subagent(&1) == subagent)
  def subagent_tool?(_, :integration), do: true
  def subagent_tool?(_, _), do: false

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
    Enum.flat_map(tools || [], fn
      %{categories: [_ | _] = categories} -> categories
      _ -> [:integration]
    end)
    |> Enum.map(&category_to_subagent/1)
    |> Enum.filter(& &1)
    |> Enum.uniq()
  end

  defp category_to_subagent(:metrics), do: :observability
  defp category_to_subagent(:logs), do: :observability
  defp category_to_subagent(:traces), do: :observability
  defp category_to_subagent(:error_tracking), do: :observability
  defp category_to_subagent(:integration), do: :integration
  defp category_to_subagent(:ticketing), do: :integration
  defp category_to_subagent(_), do: :integration
end
