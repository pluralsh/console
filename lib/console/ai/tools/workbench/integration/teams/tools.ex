defmodule Console.AI.Tools.Workbench.Integration.Teams.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @modules [
    Console.AI.Tools.Workbench.Integration.Teams.ListTeams,
    Console.AI.Tools.Workbench.Integration.Teams.ListChannels,
    Console.AI.Tools.Workbench.Integration.Teams.ListChannelMessages,
    Console.AI.Tools.Workbench.Integration.Teams.SearchUsers,
    Console.AI.Tools.Workbench.Integration.Teams.SearchTeams,
    Console.AI.Tools.Workbench.Integration.Teams.SearchGroups,
    Console.AI.Tools.Workbench.Integration.Teams.PostChannelMessage,
    Console.AI.Tools.Workbench.Integration.Teams.UpdateChannelMessage,
    Console.AI.Tools.Workbench.Integration.Teams.ReactToChannelMessage
  ]

  @spec expand(WorkbenchTool.t()) :: [struct()]
  def expand(%WorkbenchTool{} = tool), do: Enum.map(@modules, &struct(&1, tool: tool))
end
