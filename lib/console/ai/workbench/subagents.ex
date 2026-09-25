defmodule Console.AI.Workbench.Subagents do
  alias Console.AI.Tool
  alias Console.AI.Workbench.Environment
  alias Console.AI.Workbench.Subagents.{
    Coding,
    History,
    Infrastructure,
    Integration,
    Memory,
    Monitoring,
    Observability,
    Search,
    SelfService,
    Skill,
    Verify
  }

  def tool_names(subagents, %Environment{} = environment) when is_list(subagents) do
    Map.new(subagents, &{&1, cached_tool_names(&1, environment)})
  end

  defp cached_tool_names(subagent, %Environment{job: %{id: id}} = environment)
       when is_binary(id) do
    key = {__MODULE__, :tool_names, id, subagent}

    case Process.get(key) do
      names when is_list(names) -> names
      _ -> tap(resolve_tool_names(subagent, environment), &Process.put(key, &1))
    end
  end

  defp cached_tool_names(subagent, environment),
    do: resolve_tool_names(subagent, environment)

  defp resolve_tool_names(subagent, environment) do
    subagent
    |> tools(environment)
    |> Enum.map(&Tool.name/1)
    |> Enum.uniq()
    |> Enum.sort()
  end

  defp tools(:infrastructure, %Environment{job: job} = environment),
    do: Infrastructure.tools(job, environment)

  defp tools(:integration, environment), do: Integration.tools(environment)
  defp tools(:coding, environment), do: Coding.tools(environment)
  defp tools(:observability, environment), do: Observability.tools(environment)

  defp tools(:monitoring, %Environment{job: job} = environment),
    do: Monitoring.tools(environment, job)

  defp tools(:memory, environment), do: Memory.tools(environment)

  defp tools(:history, %Environment{job: job} = environment),
    do: History.tools(environment, job)

  defp tools(:skill, environment), do: Skill.tools(environment)
  defp tools(:search, environment), do: Search.tools(environment)

  defp tools(:verify, %Environment{job: job} = environment),
    do: Verify.tools(job, environment)

  defp tools(:self_service, environment), do: SelfService.tools(environment)
  defp tools(_, _), do: []
end
