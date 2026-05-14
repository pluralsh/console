defmodule Console.AI.Tools.Workbench.Integration.Bitbucket.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @all [
    Console.AI.Tools.Workbench.Integration.Bitbucket.PullRequestRead,
    Console.AI.Tools.Workbench.Integration.Bitbucket.IssueRead,
    Console.AI.Tools.Workbench.Integration.Bitbucket.CreateComment,
    Console.AI.Tools.Workbench.Integration.Bitbucket.ReactToComment
  ]

  def expand(%WorkbenchTool{} = tool), do: Enum.map(@all, &struct(&1, tool: tool))
end
