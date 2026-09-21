defmodule Console.AI.Tools.Workbench.Integration.Jira.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @modules [
    Console.AI.Tools.Workbench.Integration.Jira.ListIssues,
    Console.AI.Tools.Workbench.Integration.Jira.GetIssue,
    Console.AI.Tools.Workbench.Integration.Jira.SaveIssue,
    Console.AI.Tools.Workbench.Integration.Jira.ListComments,
    Console.AI.Tools.Workbench.Integration.Jira.SaveComment
  ]

  @spec expand(WorkbenchTool.t()) :: [struct()]
  def expand(%WorkbenchTool{tool: tool} = workbench_tool)
      when tool in [:jira, :jira_datacenter],
      do: Enum.map(@modules, &struct(&1, tool: workbench_tool))
end
