defmodule Console.AI.Workbench.Toolset do
  @moduledoc """
  Flattens a workbench's configured tools into a flat list of `Console.AI.Tool`
  implementations with no bound `WorkbenchJob`, so a workbench can be driven from outside
  the agent loop.

  Deliberately omits subagent machinery (results, skills, scratchpads, codemode), anything
  that writes job activities, and anything whose authorization scope derives from a job's
  flow.
  """
  alias Console.Repo
  alias Console.AI.Tool
  alias Console.AI.Workbench.Subagents.{Infrastructure, Integration, Observability}
  alias Console.AI.Workbench.Toolset.Classify
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

    Integration.workbench_tools(tools)
    |> Enum.concat(Observability.bench_tools(bench, tools, user))
    |> Enum.concat(Infrastructure.bench_tools(bench, tools, user))
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

  defp readonly(tools, true), do: Enum.filter(tools, &Classify.readonly?/1)
  defp readonly(tools, _), do: tools

  # Environment.new/3 splits these out before the subagents expand anything, so a function
  # tool only ever reaches a model through FunctionCall and its approval gate.  Expanding one
  # as a plain integration tool here would route around that, so mirror the same split.
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
