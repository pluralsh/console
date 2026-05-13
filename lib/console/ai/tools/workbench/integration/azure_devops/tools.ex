defmodule Console.AI.Tools.Workbench.Integration.AzureDevops.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @all [
    Console.AI.Tools.Workbench.Integration.AzureDevops.PullRequestRead,
    Console.AI.Tools.Workbench.Integration.AzureDevops.WorkItemRead,
    Console.AI.Tools.Workbench.Integration.AzureDevops.CreateComment,
    Console.AI.Tools.Workbench.Integration.AzureDevops.ReactToComment
  ]

  def expand(%WorkbenchTool{} = tool), do: Enum.map(@all, &struct(&1, tool: tool))
end
