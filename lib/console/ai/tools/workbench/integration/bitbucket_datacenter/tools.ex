defmodule Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @all [
    Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.PullRequestRead,
    Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.IssueRead,
    Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.CreateComment,
    Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.ReactToComment
  ]

  def expand(%WorkbenchTool{} = tool), do: Enum.map(@all, &struct(&1, tool: tool))
end
