defmodule Console.AI.Tools.Workbench.Integration.Gitlab.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @all [
    Console.AI.Tools.Workbench.Integration.Gitlab.MergeRequestRead,
    Console.AI.Tools.Workbench.Integration.Gitlab.IssueRead,
    Console.AI.Tools.Workbench.Integration.Gitlab.CreateNote,
    Console.AI.Tools.Workbench.Integration.Gitlab.AwardEmojiOnNote
  ]

  def expand(%WorkbenchTool{} = tool), do: Enum.map(@all, &struct(&1, tool: tool))
end
