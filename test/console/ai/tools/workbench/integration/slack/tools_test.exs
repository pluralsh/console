defmodule Console.AI.Tools.Workbench.Integration.Slack.ToolsTest do
  use ExUnit.Case, async: true

  alias Console.AI.Tools.Workbench.Integration.Slack.{
    CreateChannel,
    EditMessage,
    FindChannelByName,
    InviteToChannel,
    ListChannels,
    ListMessages,
    ListUserGroups,
    PostMessage,
    ReactToMessage,
    Tools
  }

  alias Console.Schema.WorkbenchTool

  describe "expand/1" do
    test "exposes the Slack workspace tools for a workbench tool" do
      tool = %WorkbenchTool{name: "slack", tool: :slack}

      assert [
               %ListChannels{tool: ^tool},
               %ListMessages{tool: ^tool},
               %ListUserGroups{tool: ^tool},
               %FindChannelByName{tool: ^tool},
               %InviteToChannel{tool: ^tool},
               %CreateChannel{tool: ^tool},
               %PostMessage{tool: ^tool},
               %EditMessage{tool: ^tool},
               %ReactToMessage{tool: ^tool}
             ] = Tools.expand(tool)
    end
  end
end
