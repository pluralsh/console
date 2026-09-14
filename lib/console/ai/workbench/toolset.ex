defmodule Console.AI.Workbench.Toolset do
  @moduledoc """
  Assembles the tools a workbench exposes with no `WorkbenchJob` bound, so a workbench can be
  driven from outside the agent loop.

  `Console.AI.Workbench.Tools` covers everything derived from a `WorkbenchTool`, and the rest
  are builtins gated on the workbench's configuration and scoped to the acting user.

  Deliberately omits subagent machinery (results, skills, scratchpads, codemode, history),
  function tools, which are only safe behind `FunctionCall`'s approval flow, MCP-proxied tools,
  which need a live client bound to a job, and anything whose authorization scope derives from
  a job's flow.
  """
  import Console.AI.Workbench.Subagents.Base, only: [if_vector_store_enabled: 1]
  alias Console.Repo
  alias Console.AI.Tool
  alias Console.AI.Workbench.Tools
  alias Console.AI.Workbench.Toolset.Classify
  alias Console.AI.Tools.Agent.{ServiceComponent, Stack}
  alias Console.AI.Tools.Workbench.SummarizeComponent
  alias Console.AI.Tools.Workbench.Infrastructure.{
    ApiDiscovery,
    ApiSpec,
    Cluster,
    ClusterList,
    ClusterTags,
    PodLogs,
    Projects,
    RawKubeGet,
    RawKubeList,
    StackInspect,
    StackList,
    StateSearch,
    Vulns
  }
  alias Console.AI.Tools.Workbench.Observability.Plrl
  alias Console.Schema.{User, Workbench, WorkbenchTool}

  @type filter :: :all | {:names, [binary]} | {:categories, [atom]}

  @preloads [tools: [:mcp_server, :cloud_connection, :scm_connection]]

  @doc """
  Expands every tool a workbench exposes that is safe to run outside the agent loop.

  Supported options:

    * `:readonly` - drop mutating tools, defaults to `true`
  """
  @spec tools(Workbench.t, User.t, keyword) :: [term]
  def tools(%Workbench{} = bench, %User{} = user, opts \\ []) do
    %Workbench{tools: tools} = bench = Repo.preload(bench, @preloads)
    tools = Enum.reject(tools, &function?/1)

    Tools.integration_tools(tools)
    |> Enum.concat(Tools.obs_tools(tools))
    |> Enum.concat(Tools.cloud_tools(tools))
    |> Enum.concat(builtins(bench, user))
    |> Enum.uniq_by(&Tool.name/1)
    |> readonly(Keyword.get(opts, :readonly, true))
  end

  @doc """
  Narrows an expanded toolset, either to an explicit set of tool names or to the workbench
  tool categories the tools were derived from.
  """
  @spec filter([term], filter) :: [term]
  def filter(tools, :all), do: tools
  def filter(tools, {:names, names}) do
    allowed = MapSet.new(names)
    Enum.filter(tools, & MapSet.member?(allowed, Tool.name(&1)))
  end
  def filter(tools, {:categories, categories}) do
    allowed = MapSet.new(categories)
    Enum.filter(tools, fn tool ->
      categories(tool)
      |> Enum.any?(& MapSet.member?(allowed, &1))
    end)
  end

  # config-gated tools that aren't derived from a WorkbenchTool.  ServiceInspect and
  # ClusterServices are left out because they scope on the job's flow, and check_flow/2 goes
  # permissive when there's no job to scope against.
  defp builtins(%Workbench{} = bench, %User{} = user) do
    cluster_tools(bench, user)
    |> Enum.concat(stack_tools(bench, user))
    |> Enum.concat(k8s_tools(bench, user))
    |> Enum.concat(pod_logs_tools(bench, user))
    |> Enum.concat(vuln_tools(bench, user))
    |> Enum.concat(plrl_log_tools(bench, user))
    |> Enum.concat(plrl_metric_tools(bench))
  end

  defp cluster_tools(%Workbench{configuration: %{infrastructure: %{services: true}}}, %User{} = user) do
    if_vector_store_enabled(ServiceComponent) ++ [
      %Cluster{user: user},
      %ClusterList{user: user},
      %ClusterTags{user: user},
      %Projects{user: user}
    ]
  end
  defp cluster_tools(_, _), do: []

  defp stack_tools(%Workbench{configuration: %{infrastructure: %{stacks: true}}}, %User{} = user) do
    if_vector_store_enabled(Stack) ++ [
      %StackInspect{user: user},
      %StackList{user: user},
      %StateSearch{user: user}
    ]
  end
  defp stack_tools(_, _), do: []

  defp k8s_tools(%Workbench{configuration: %{infrastructure: %{kubernetes: true}}}, %User{} = user) do
    [
      SummarizeComponent,
      %ApiDiscovery{user: user},
      %ApiSpec{user: user},
      %RawKubeGet{user: user},
      %RawKubeList{user: user}
    ]
  end
  defp k8s_tools(_, _), do: []

  defp pod_logs_tools(%Workbench{configuration: %{infrastructure: %{pod_logs: true}}}, %User{} = user),
    do: [%PodLogs{user: user}]
  defp pod_logs_tools(_, _), do: []

  defp vuln_tools(%Workbench{configuration: %{infrastructure: %{vulnerabilities: true}}}, %User{} = user),
    do: [%Vulns{user: user}]
  defp vuln_tools(_, _), do: []

  defp plrl_log_tools(%Workbench{configuration: %{observability: %{logs: true}}}, %User{} = user) do
    [
      %Plrl.Logs{user: user},
      %Plrl.LogsAggregate{user: user},
      %Plrl.LogLabels{user: user}
    ]
  end
  defp plrl_log_tools(_, _), do: []

  defp plrl_metric_tools(%Workbench{configuration: %{observability: %{metrics: true}}}),
    do: [Plrl.Metrics, Plrl.MetricsSearch, Plrl.MetricsLabelSearch]
  defp plrl_metric_tools(_), do: []

  defp readonly(tools, true), do: Enum.filter(tools, &Classify.readonly?/1)
  defp readonly(tools, _), do: tools

  # Environment.new/3 splits these out before the subagents expand anything, so a function tool
  # only ever reaches a model through FunctionCall and its approval gate.  Expanding one here as
  # a plain integration or cloud tool would route around that, so mirror the same split.
  defp function?(%WorkbenchTool{categories: [_ | _] = categories}), do: :function in categories
  defp function?(%WorkbenchTool{tool: :http, configuration: %{http: %{function: true}}}), do: true
  defp function?(_), do: false

  defp categories(%{tool: %WorkbenchTool{categories: [_ | _] = categories}}), do: categories
  defp categories(%{tool: %WorkbenchTool{}}), do: [:integration]
  defp categories(%mod{}), do: builtin_categories(mod)
  defp categories(mod) when is_atom(mod), do: builtin_categories(mod)
  defp categories(_), do: []

  defp builtin_categories(mod) do
    case Classify.bucket(mod) do
      nil -> []
      bucket -> [bucket]
    end
  end
end
