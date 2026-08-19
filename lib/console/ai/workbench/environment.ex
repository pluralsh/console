defmodule Console.AI.Workbench.Environment do
  alias Console.Schema.{
    WorkbenchJob,
    Workbench,
    WorkbenchTool,
    WorkbenchJobActivity,
    User
  }
  alias Console.{AI.ModelSelection, Deployments.Settings}
  alias Console.AI.Tool
  alias Console.Deployments.Workbenches
  alias Console.AI.Workbench.{Skill, Skills.Builtins, Heartbeat}

  @type t :: %__MODULE__{
    user: User.t,
    job: WorkbenchJob.t,
    tools: %{binary => WorkbenchTool.t},
    functions: [WorkbenchTool.t],
    skills: %{binary => Skill.t},
    activities: [WorkbenchJobActivity.t],
    policies: [Tool.Policy.t]
  }

  defmodule Actions, do: defstruct [:functions, :kubernetes]

  defguardp is_map_or_list(m) when is_map(m) or is_list(m)

  defstruct [:job, :tools, :skills, :user, functions: [], activities: [], policies: [], verifiable: false]

  def new(%WorkbenchJob{} = job, tools, skills) when is_map_or_list(tools) and is_map_or_list(skills) do
    {functions, tools} = Enum.split_with(to_l(tools), fn
      %WorkbenchTool{categories: [_ | _] = categories} -> :function in categories
      %WorkbenchTool{tool: :http, configuration: %{http: %{function: true}}} -> true
      _ -> false
    end)

    %__MODULE__{
      user: job.user,
      job: job,
      tools: to_map(tools),
      functions: functions,
      skills: to_map(skills),
      policies: policies(job)
    }
    |> save()
  end

  def engine_opts(%__MODULE__{job: job, policies: policies}) do
    settings = Settings.cached()

    case ModelSelection.tool_model(job, settings) do
      %{model: model, provider: provider} ->
        price_sheet = ModelSelection.price_sheet(settings, provider, model)

        [
          model: model,
          provider: provider,
          policies: policies,
          usage_callback: &Heartbeat.usage_callback(job, provider, model, price_sheet, &1)
        ]

      _ ->
        [
          policies: policies,
          usage_callback: &Heartbeat.usage_callback(job, &1)
        ]
    end
  end

  def engine_opts(%WorkbenchJob{} = job) do
    settings = Settings.cached()

    case ModelSelection.tool_model(job, settings) do
      %{model: model, provider: provider} ->
        price_sheet = ModelSelection.price_sheet(settings, provider, model)

        [
          model: model,
          provider: provider,
          usage_callback: &Heartbeat.usage_callback(job, provider, model, price_sheet, &1)
        ]

      _ ->
        [usage_callback: &Heartbeat.usage_callback(job, &1)]
    end
  end

  defp policies(%WorkbenchJob{workbench_id: id}) when is_binary(id) do
    Workbenches.get_workbench_policies(id)
    |> Enum.map(fn
      %{policy: %{id: id, name: name, policy: source}, matches: matches} ->
        matches = matches || %{}
        %Tool.Policy{
          regexes: Map.get(matches, :parsed_regexes, []),
          ignore: Map.get(matches, :ignore, []),
          name: name,
          policy: source,
          policy_id: id
        }
    end)
  end
  defp policies(_), do: []

  def actions(%__MODULE__{functions: funcs, job: job}) do
    %Actions{
      functions: is_list(funcs) && !Enum.empty?(funcs),
      kubernetes: has_k8s?(job)
    }
  end

  defp has_k8s?(%WorkbenchJob{modes: %{kubernetes: %{update: u, delete: d}}}), do: (u || d)
  defp has_k8s?(_), do: false

  def with_builtins(skills) when is_map(skills) do
    Builtins.builtins()
    |> Map.new(fn %Skill{name: name} = skill -> {name, skill} end)
    |> Map.merge(skills)
  end

  def subagent_skills(%__MODULE__{skills: %{} = skills}, subagent), do: subagent_skills(skills, subagent)
  def subagent_skills(%{} = skills, subagent) do
    Enum.filter(skills, fn {_, skill} -> Skill.subagent?(skill, subagent) end)
    |> Map.new()
  end

  def subagents(%__MODULE__{verifiable: true, job: job}), do: [:verify | subagents(job)]
  def subagents(%__MODULE__{} = environment), do: subagents(environment.job)

  def subagents(%WorkbenchJob{workbench: %Workbench{tools: tools} = bench} = job) do
    tool_agents(tools)
    |> Enum.concat(type_subagents(job))
    |> Enum.concat(coding_agents(bench))
    |> Enum.concat(infra_agents(bench))
    |> Enum.filter(&allow_subagent?(job, &1))
  end

  defp allow_subagent?(%WorkbenchJob{type: :skill}, :canvas), do: false
  defp allow_subagent?(%WorkbenchJob{type: :skill}, :coding), do: false
  defp allow_subagent?(_, _), do: true

  def categories(%WorkbenchJob{workbench: %Workbench{tools: tools}}) when is_list(tools) do
    Enum.flat_map(tools, & (&1.categories || []))
    |> Enum.uniq()
  end
  def categories(_), do: []

  defp to_map(m) when is_map(m), do: m
  defp to_map(l) when is_list(l), do: Map.new(l, & {&1.name, &1})

  defp to_l(m) when is_map(m), do: Map.values(m)
  defp to_l(l) when is_list(l), do: l

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

  defp infra_agents(%Workbench{
         configuration: %{infrastructure: %{services: s, stacks: st, kubernetes: k, pod_logs: pl}}
       }) do
    case s || st || k || pl do
      true -> [:infrastructure]
      _ -> []
    end
  end
  defp infra_agents(_), do: []

  defp type_subagents(%WorkbenchJob{type: :skill}), do: [:history, :skill]
  defp type_subagents(_), do: []

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
  defp category_to_subagent(:search), do: :search
  defp category_to_subagent(:scm), do: :integration
  defp category_to_subagent(:chat), do: :integration
  defp category_to_subagent(:observability), do: :observability
  defp category_to_subagent(:infrastructure), do: :infrastructure
  defp category_to_subagent(:coding), do: :coding
  defp category_to_subagent(:verification), do: :verify
  defp category_to_subagent(_), do: :integration
end
