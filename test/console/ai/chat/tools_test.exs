defmodule Console.AI.Chat.ToolsTest do
  use Console.DataCase, async: true

  alias Console.AI.Chat.Tools
  alias Console.Schema.{AgentSession, ChatThread}

  describe "#tools/1" do
    test "does not expose vector search tools when vector store is disabled" do
      deployment_settings(ai: %{
        enabled: true,
        provider: :openai,
        openai: %{access_token: "key"},
        vector_store: %{enabled: false}
      })

      vector_tools = [
        Console.AI.Tools.Agent.ServiceComponent,
        Console.AI.Tools.Agent.Stack
      ]

      for thread <- vector_tool_threads() do
        tools = Tools.tools(thread)

        refute Enum.any?(vector_tools, &(&1 in tools))
      end
    end
  end

  defp vector_tool_threads() do
    [
      %ChatThread{research_id: "research-id"},
      %ChatThread{session: %AgentSession{type: :search}},
      %ChatThread{session: %AgentSession{type: :provisioning}},
      %ChatThread{session: %AgentSession{type: :terraform}},
      %ChatThread{session: %AgentSession{type: :kubernetes}}
    ]
  end
end
