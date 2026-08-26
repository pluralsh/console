defmodule Console.AI.Workbench.Tools do
  @moduledoc """
  Constructs workbench-backed AI tools and indexes them by tool name.

  Agent loops can later recover `{module, workbench_tool}` from a tool call name
  so thoughts and other records can reinfer the originating `WorkbenchTool`.
  """
  alias Console.AI.Tool
  alias Console.AI.Workbench.{Environment, MCP}
  alias Console.AI.Tools.Workbench.{Http, FunctionCall}
  alias Console.AI.Tools.Workbench.Observability.{
    Metrics,
    MetricsSearch,
    MetricsLabelSearch,
    Logs,
    Traces
  }
  alias Console.AI.Tools.Workbench.Infrastructure.{CloudSchemas, RawCloudQuery, CloudTables}
  alias Console.AI.Tools.Workbench.Integration.{
    Github,
    Gitlab,
    Bitbucket,
    BitbucketDatacenter,
    AzureDevops,
    Teams,
    Pagerduty,
    Docker,
    Sentry,
    Slack
  }
  alias Console.Schema.{Workbench, WorkbenchJob, WorkbenchTool}

  @type entry :: {module, WorkbenchTool.t}
  @type index :: %{binary => entry}

  @obs_categories MapSet.new(~w(metrics logs traces error_tracking)a)
  @integration_tools ~w(http slack pagerduty github gitlab bitbucket bitbucket_datacenter teams azure_devops docker)a

  @doc """
  Maps each constructed tool name to `{module, workbench_tool}`.

  Accepts a workbench with tools preloaded. Pass a job (or an `Environment`) to
  include MCP expansions, which require a live MCP client for that job.
  """
  @spec index(Workbench.t | Environment.t | [WorkbenchTool.t] | map) :: index
  def index(%Environment{tools: tools, functions: funcs, job: job}),
    do: index(tool_values(tools) ++ List.wrap(funcs), job)
  def index(%Workbench{tools: tools}), do: index(tools, nil)
  def index(tools) when is_list(tools) or is_map(tools), do: index(tools, nil)

  @spec index(Workbench.t | [WorkbenchTool.t] | map, WorkbenchJob.t | nil) :: index
  def index(%Workbench{tools: tools}, job), do: index(tools, job)
  def index(tools, job) when is_list(tools) or is_map(tools) do
    expand(tools, job)
    |> Map.new(fn %mod{tool: %WorkbenchTool{} = wt} = instance ->
      {Tool.name(instance), {mod, wt}}
    end)
  end

  @doc "Looks up `{module, workbench_tool}` for a tool name against a workbench or prebuilt index."
  @spec get(Workbench.t | Environment.t | index, binary) :: entry | nil
  def get(%Workbench{} = workbench, name) when is_binary(name), do: get(index(workbench), name)
  def get(%Environment{} = environment, name) when is_binary(name), do: get(index(environment), name)
  def get(%{} = index, name) when is_binary(name), do: Map.get(index, name)

  @spec get(Workbench.t, WorkbenchJob.t, binary) :: entry | nil
  def get(%Workbench{} = workbench, %WorkbenchJob{} = job, name) when is_binary(name),
    do: get(index(workbench, job), name)

  @doc "Expands every workbench-backed AI tool, including MCP tools when a job is provided."
  @spec expand(Workbench.t | Environment.t | [WorkbenchTool.t] | map, WorkbenchJob.t | nil) :: [struct]
  def expand(source, job \\ nil)
  def expand(%Environment{tools: tools, functions: funcs, job: job}, _),
    do: expand(tool_values(tools) ++ List.wrap(funcs), job)
  def expand(%Workbench{tools: tools}, job), do: expand(tools, job)
  def expand(tools, job) do
    tools = tool_values(tools)

    cloud_tools(tools)
    |> Enum.concat(obs_tools(tools))
    |> Enum.concat(integration_tools(tools))
    |> Enum.concat(function_tools(tools, job))
    |> Enum.concat(mcp_tools(tools, job))
  end

  @doc "Cloud query tools (`CloudSchemas`, `RawCloudQuery`, `CloudTables`) for `:cloud` workbench tools."
  @spec cloud_tools(Workbench.t | [WorkbenchTool.t] | map) :: [struct]
  def cloud_tools(%Workbench{tools: tools}), do: cloud_tools(tools)
  def cloud_tools(tools) do
    Enum.flat_map(tool_values(tools), fn
      %WorkbenchTool{tool: :cloud} = tool -> [
        %CloudSchemas{tool: tool},
        %RawCloudQuery{tool: tool},
        %CloudTables{tool: tool}
      ]
      _ -> []
    end)
  end

  @doc "Observability tools for metrics, logs, traces, and error tracking workbench tools."
  @spec obs_tools(Workbench.t | [WorkbenchTool.t] | map) :: [struct]
  def obs_tools(%Workbench{tools: tools}), do: obs_tools(tools)
  def obs_tools(tools) do
    Enum.filter(tool_values(tools), fn
      %WorkbenchTool{tool: t, categories: [_ | _] = categories} when t != :mcp ->
        MapSet.subset?(MapSet.new(categories), @obs_categories)
      _ -> false
    end)
    |> Enum.flat_map(fn
      %WorkbenchTool{tool: :sentry} = tool -> Sentry.Tools.expand(tool)
      %WorkbenchTool{categories: [_ | _] = categories} = tool ->
        Enum.flat_map(categories, &obs_category_tools(tool, &1))
      _ -> []
    end)
  end

  @doc "Integration tools (HTTP, Slack, SCM, chat, PagerDuty, Docker, etc.)."
  @spec integration_tools(Workbench.t | [WorkbenchTool.t] | map) :: [struct]
  def integration_tools(%Workbench{tools: tools}), do: integration_tools(tools)
  def integration_tools(tools) do
    Enum.reject(tool_values(tools), &function_tool?/1)
    |> Enum.filter(fn
      %WorkbenchTool{tool: t} when t in @integration_tools -> true
      _ -> false
    end)
    |> Enum.flat_map(&expand_integration/1)
  end

  @doc "SCM-category tools (GitHub, GitLab, Bitbucket, Azure DevOps)."
  @spec scm_tools(Workbench.t | [WorkbenchTool.t] | map) :: [struct]
  def scm_tools(%Workbench{tools: tools}), do: scm_tools(tools)
  def scm_tools(tools) do
    Enum.filter(tool_values(tools), fn
      %WorkbenchTool{categories: categories} when is_list(categories) -> :scm in categories
      _ -> false
    end)
    |> Enum.flat_map(&expand_integration/1)
  end

  @doc "Function-call tools (lambda, cloud run, azure function, HTTP functions)."
  @spec function_tools(Workbench.t | [WorkbenchTool.t] | map, WorkbenchJob.t | nil) :: [struct]
  def function_tools(tools, job \\ nil)
  def function_tools(%Workbench{tools: tools}, job), do: function_tools(tools, job)
  def function_tools(tools, job) do
    Enum.filter(tool_values(tools), &function_tool?/1)
    |> Enum.map(& %FunctionCall{tool: &1, job: job})
  end

  @doc "Expands MCP-backed workbench tools (generic MCP, Linear, Atlassian, Exa) for a job."
  @spec mcp_tools(Workbench.t | [WorkbenchTool.t] | map, WorkbenchJob.t | nil) :: [struct]
  def mcp_tools(_, nil), do: []
  def mcp_tools(%Workbench{tools: tools}, %WorkbenchJob{} = job), do: mcp_tools(tools, job)
  def mcp_tools(tools, %WorkbenchJob{} = job), do: MCP.expand_tools(tools, job)
  def mcp_tools(_, _), do: []

  defp obs_category_tools(%WorkbenchTool{} = tool, :metrics),
    do: [%Metrics{tool: tool}, %MetricsSearch{tool: tool}, %MetricsLabelSearch{tool: tool}]
  defp obs_category_tools(%WorkbenchTool{} = tool, :logs), do: [%Logs{tool: tool}]
  defp obs_category_tools(%WorkbenchTool{} = tool, :traces), do: [%Traces{tool: tool}]
  defp obs_category_tools(_, _), do: []

  defp expand_integration(%WorkbenchTool{tool: :http} = tool), do: [%Http{tool: tool}]
  defp expand_integration(%WorkbenchTool{tool: :slack} = tool), do: Slack.Tools.expand(tool)
  defp expand_integration(%WorkbenchTool{tool: :github} = tool), do: Github.Tools.expand(tool)
  defp expand_integration(%WorkbenchTool{tool: :gitlab} = tool), do: Gitlab.Tools.expand(tool)
  defp expand_integration(%WorkbenchTool{tool: :bitbucket} = tool), do: Bitbucket.Tools.expand(tool)
  defp expand_integration(%WorkbenchTool{tool: :bitbucket_datacenter} = tool),
    do: BitbucketDatacenter.Tools.expand(tool)
  defp expand_integration(%WorkbenchTool{tool: :azure_devops} = tool), do: AzureDevops.Tools.expand(tool)
  defp expand_integration(%WorkbenchTool{tool: :teams} = tool), do: Teams.Tools.expand(tool)
  defp expand_integration(%WorkbenchTool{tool: :pagerduty} = tool), do: Pagerduty.Tools.expand(tool)
  defp expand_integration(%WorkbenchTool{tool: :docker} = tool), do: Docker.Tools.expand(tool)
  defp expand_integration(_), do: []

  defp function_tool?(%WorkbenchTool{categories: [_ | _] = categories}), do: :function in categories
  defp function_tool?(%WorkbenchTool{tool: :http, configuration: %{http: %{function: true}}}), do: true
  defp function_tool?(_), do: false

  defp tool_values(%Workbench{tools: tools}), do: tool_values(tools)
  defp tool_values(nil), do: []
  defp tool_values(%Ecto.Association.NotLoaded{}), do: []
  defp tool_values(tools) when is_map(tools), do: Map.values(tools)
  defp tool_values(tools) when is_list(tools), do: tools
end
