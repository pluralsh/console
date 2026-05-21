defmodule Console.AI.Tools.Workbench.Integration.Sentry.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @modules [
    Console.AI.Tools.Workbench.Integration.Sentry.ListIssues,
    Console.AI.Tools.Workbench.Integration.Sentry.IssueRead,
    Console.AI.Tools.Workbench.Integration.Sentry.ListIssueEvents,
    Console.AI.Tools.Workbench.Integration.Sentry.GetLatestIssueEvent,
    Console.AI.Tools.Workbench.Integration.Sentry.EventRead
  ]

  @spec expand(WorkbenchTool.t()) :: [struct()]
  def expand(%WorkbenchTool{} = tool), do: Enum.map(@modules, &struct(&1, tool: tool))
end
