defmodule Console.AI.Workbench.Subagents.Infrastructure do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchTool, WorkbenchJobActivity, Workbench, User}
  alias Console.AI.Tools.Workbench.{
    SummarizeComponent,
    Result,
    Skills,
    Skill,
    Infrastructure.KubeGet,
    Infrastructure.KubeList,
    Infrastructure.ServiceFiles,
    Infrastructure.StackFiles,
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
    Infrastructure.CloudTables
  }
  alias Console.AI.Tools.Agent.{ServiceComponent, Stack}
  alias Console.AI.Workbench.Environment

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt} = job, %Environment{} = environment) do
    system_prompt = String.trim(system_prompt(prompt: jprompt, cloud_tools: has_cloud_tools?(environment.tools)))
    tools(job, environment)
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

  defp tools(%WorkbenchJob{workbench: bench, user: user}, %Environment{skills: skills} = environment) do
    svc_tools(bench, user)
    |> Enum.concat(stack_tools(bench, user))
    |> Enum.concat(k8s_tools(bench, user))
    |> Enum.concat(cloud_tools(environment))
    |> Enum.concat([
      %Skills{skills: Environment.subagent_skills(skills, :infrastructure)},
      %Skill{skills: Environment.subagent_skills(skills, :infrastructure)},
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
      ServiceFiles,
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
      StackFiles,
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

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "infrastructure.md.eex"]), [:assigns])
end
