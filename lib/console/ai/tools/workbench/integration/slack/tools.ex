defmodule Console.AI.Tools.Workbench.Integration.Slack.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @modules [
    Console.AI.Tools.Workbench.Integration.Slack.ListChannels,
    Console.AI.Tools.Workbench.Integration.Slack.ListMessages,
    Console.AI.Tools.Workbench.Integration.Slack.ListUserGroups,
    Console.AI.Tools.Workbench.Integration.Slack.FindChannelByName,
    Console.AI.Tools.Workbench.Integration.Slack.InviteToChannel,
    Console.AI.Tools.Workbench.Integration.Slack.CreateChannel,
    Console.AI.Tools.Workbench.Integration.Slack.PostMessage,
    Console.AI.Tools.Workbench.Integration.Slack.EditMessage,
    Console.AI.Tools.Workbench.Integration.Slack.ReactToMessage
  ]

  @spec expand(WorkbenchTool.t()) :: [struct()]
  def expand(%WorkbenchTool{} = tool), do: Enum.map(@modules, &struct(&1, tool: tool))
end
