defmodule Console.Schema.ChatConnectionTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Workbench.Integration.Slack.PostMessage
  alias Console.AI.Tools.Workbench.Integration.Teams.Tools, as: TeamsTools
  alias Console.Schema.{ChatConnection, WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.SlackConnection, Configuration.TeamsConnection}

  describe "to_tool/1" do
    test "converts a slack chat connection into a workbench tool" do
      conn = insert(:chat_connection, name: "prod-slack")
      tool = ChatConnection.to_tool(conn)

      assert %WorkbenchTool{
               tool: :slack,
               name: "prod-slack",
               categories: [:chat],
               configuration: %Configuration{
                 slack: %SlackConnection{bot_token: bot_token}
               }
             } = tool

      assert bot_token == conn.configuration.slack.bot_token
      assert match?(%PostMessage{}, struct(PostMessage, tool: tool))
    end

    test "converts a teams chat connection into a workbench tool" do
      conn =
        insert(:chat_connection,
          name: "prod-teams",
          type: :teams,
          configuration: %{
            teams: %{
              client_id: "client-id",
              client_secret: "client-secret",
              tenant_id: "tenant-id"
            }
          }
        )

      tool = ChatConnection.to_tool(conn)

      assert %WorkbenchTool{
               tool: :teams,
               name: "prod-teams",
               categories: [:chat],
               configuration: %Configuration{
                 teams: %TeamsConnection{
                   client_id: "client-id",
                   client_secret: "client-secret",
                   tenant_id: "tenant-id"
                 }
               }
             } = tool

      assert Enum.all?(TeamsTools.expand(tool), &match?(%{tool: ^tool}, &1))
    end
  end
end
