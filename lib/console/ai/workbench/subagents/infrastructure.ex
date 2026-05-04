defmodule Console.AI.Workbench.Subagents.Infrastructure do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchTool, WorkbenchJobActivity, Workbench, User}
  alias Console.AI.Tools.Workbench.{
    SummarizeComponent,
    Result,
    Skills,
    Skill,
    History,
    Calculator,
    Infrastructure.KubeGet,
    Infrastructure.KubeList,
    Infrastructure.Cluster,
    Infrastructure.ClusterList,
    Infrastructure.ClusterTags,
    Infrastructure.Projects,
    Infrastructure.ClusterServices,
    Infrastructure.ServiceInspect,
    Infrastructure.StackList,
    Infrastructure.StackInspect,
    Infrastructure.CloudSchema,
    Infrastructure.CloudQuery,
    Infrastructure.CloudTables,
    Infrastructure.PodLogs,
    Infrastructure.VulnReports,
    Infrastructure.Vulns,
    Infrastructure.Manifests
  }
  alias Console.AI.Tools.Agent.{ServiceComponent, Stack}
  alias Console.AI.Workbench.{Environment, FileCache}

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt} = job, %Environment{} = environment) do
    system_prompt = String.trim(system_prompt(prompt: jprompt, cloud_tools: has_cloud_tools?(environment.tools)))
    tools(job, environment, FileCache.new())
    |> MemoryEngine.new(50, system_prompt: system_prompt, acc: %{}, callback: &callback(activity, &1))
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, result: %{error: "error running infrastructure subagent: #{inspect(error)}"}}
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%Result{}, &1)) do
      %Result{output: output} -> {:halt, %{
        status: :successful,
        result: %{output: output}
      }}
      _ -> last_message(messages, & {:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  defp tools(%WorkbenchJob{workbench: bench, user: user}, %Environment{skills: skills, job: job, activities: activities} = environment, %FileCache{} = cache) do
    svc_tools(bench, user)
    |> Enum.concat(stack_tools(bench, user))
    |> Enum.concat(k8s_tools(bench, user))
    |> Enum.concat(pod_logs_tools(bench, user))
    |> Enum.concat(vuln_tools(bench, user))
    |> Enum.concat(cloud_tools(environment))
    |> Enum.concat(manifests_tools(bench, user, cache))
    |> Enum.concat([
      %Skills{skills: Environment.subagent_skills(skills, :infrastructure)},
      %Skill{skills: Environment.subagent_skills(skills, :infrastructure)},
      Calculator,
      %History{job: job, activities: activities},
      Result
    ])
  end

  defp cloud_tools(%Environment{tools: tools}) do
    Enum.flat_map(tools, fn
      {_, %WorkbenchTool{tool: :cloud} = tool} -> [
        %CloudSchema{tool: tool},
        %CloudQuery{tool: tool},
        %CloudTables{tool: tool}
      ]
      _ -> []
    end)
  end

  defp has_cloud_tools?(tools) do
    Enum.any?(tools, fn
      {_, %WorkbenchTool{tool: :cloud}} -> true
      _ -> false
    end)
  end

  defp svc_tools(%Workbench{configuration: %{infrastructure: %{services: true}}}, user) do
    [
      ServiceComponent,
      %ServiceInspect{user: user},
      %ClusterServices{user: user},
      %Cluster{user: user},
      %ClusterList{user: user},
      %ClusterTags{user: user},
      %Projects{user: user}
    ]
  end
  defp svc_tools(_, _), do: []

  defp stack_tools(%Workbench{configuration: %{infrastructure: %{stacks: true}}}, user) do
    [
      Stack,
      %StackInspect{user: user},
      %StackList{user: user}
    ]
  end
  defp stack_tools(_, _), do: []

  defp k8s_tools(%Workbench{configuration: %{infrastructure: %{kubernetes: true}}}, %User{} = user) do
    [
      SummarizeComponent,
      %KubeGet{user: user},
      %KubeList{user: user}
    ]
  end
  defp k8s_tools(_, _), do: []

  defp pod_logs_tools(%Workbench{configuration: %{infrastructure: %{pod_logs: true}}}, %User{} = user),
    do: [%PodLogs{user: user}]
  defp pod_logs_tools(_, _), do: []

  defp manifests_tools(%Workbench{configuration: %{infrastructure: %{services: s, stacks: st}}}, %User{} = user, %FileCache{} = cache) do
    case s || st do
      true -> [%Manifests{user: user, cache: cache}]
      _ -> []
    end
  end
  defp manifests_tools(_, _, _), do: []

  defp vuln_tools(%Workbench{configuration: %{infrastructure: %{vulnerabilities: true}}}, %User{} = user), do: [%Vulns{user: user}]
  defp vuln_tools(_, _), do: []

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "infrastructure.md.eex"]), [:assigns])
end
