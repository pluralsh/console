defmodule Console.AI.Workbench.MCP.Toolset do
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
  alias Console.AI.Workbench.MCP.Toolset.Classify
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

  # MCP tool names are [a-zA-Z0-9_-]; workbench names allow dots and similar.
  @invalid_chars ~r/[^a-zA-Z0-9_-]/

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

  Name filters are compared after `mcp_name/1`, so either the raw `Tool.name/1` or the
  advertised MCP name will match.
  """
  @spec filter([term], filter) :: [term]
  def filter(tools, :all), do: tools
  def filter(tools, {:names, names}) do
    allowed = MapSet.new(names, &mcp_name/1)
    Enum.filter(tools, & MapSet.member?(allowed, mcp_name(&1)))
  end
  def filter(tools, {:categories, categories}) do
    allowed = MapSet.new(categories)
    Enum.filter(tools, fn tool ->
      categories(tool)
      |> Enum.any?(& MapSet.member?(allowed, &1))
    end)
  end

  @doc """
  MCP-safe form of a tool name.  Characters outside `[a-zA-Z0-9_-]` become `_`,
  matching what we advertise to clients.
  """
  @spec mcp_name(term) :: binary
  def mcp_name(name) when is_binary(name), do: String.replace(name, @invalid_chars, "_")
  def mcp_name(tool), do: mcp_name(Tool.name(tool))

  @doc """
  Indexes tools by `mcp_name/1`.  Distinct workbench names that sanitize to the
  same identifier are an error rather than a silent overwrite.
  """
  @spec mcp_index([term]) :: {:ok, %{binary => term}} | {:error, binary}
  def mcp_index(tools), do: Enum.reduce_while(tools, {:ok, %{}}, &index_one/2)

  defp index_one(tool, {:ok, acc}) do
    name = mcp_name(tool)
    case acc do
      %{^name => existing} -> {:halt, {:error, collision(existing, tool, name)}}
      _ -> {:cont, {:ok, Map.put(acc, name, tool)}}
    end
  end

  defp collision(existing, tool, name) do
    "MCP tool name collision: #{Tool.name(existing)} and #{Tool.name(tool)} both map to #{name}"
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

  defp categories(%{tool: %WorkbenchTool{tool: :docker, categories: [_ | _] = categories}}),
    do: Enum.uniq([:infrastructure | categories])
  defp categories(%{tool: %WorkbenchTool{tool: :docker}}), do: [:infrastructure, :integration]
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
