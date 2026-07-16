defmodule Console.Chat.Impl.TeamsTest do
  use Console.DataCase, async: true
  alias Console.Chat.Impl.Teams
  alias Console.Schema.ChatbotMessage
  alias Console.Repo

  @bot_id "28:bot-app-id"
  @channel_id "19:channel@thread.tacv2"

  defp activity(overrides \\ %{}) do
    Map.merge(
      %{
        "type" => "message",
        "id" => "activity-1",
        "serviceUrl" => "https://smba.trafficmanager.net/amer/",
        "recipient" => %{"id" => @bot_id, "name" => "Console Bot"},
        "conversation" => %{"id" => "#{@channel_id};messageid=1"},
        "channelData" => %{"channel" => %{"id" => @channel_id}},
        "text" => "<at>Console Bot</at> please fix the deploy",
        "entities" => [%{"type" => "mention", "mentioned" => %{"id" => @bot_id}}]
      },
      overrides
    )
  end

  defp teams_connection() do
    insert(:chat_connection,
      type: :teams,
      configuration: %{teams: %{client_id: "cid", client_secret: "secret", tenant_id: "tid"}}
    )
  end

  describe "handle_activity/2" do
    test "spawns a workbench job and persists reply context when the bot is mentioned" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      conn = teams_connection()

      insert(:workbench_chatbot,
        workbench: workbench,
        chat_connection: conn,
        user: user,
        channel: @channel_id,
        prompt: "be helpful"
      )

      assert :ok = Teams.handle_activity(conn, activity())

      assert [%ChatbotMessage{} = msg] = Repo.all(ChatbotMessage)
      assert msg.chat_connection_id == conn.id
      assert msg.channel == @channel_id
      assert msg.message == "please fix the deploy"
      assert msg.service_url == "https://smba.trafficmanager.net/amer/"
      assert msg.conversation_id == "#{@channel_id};messageid=1"
      assert msg.activity_id == "activity-1"
    end

    test "ignores messages that do not mention the bot" do
      conn = teams_connection()

      no_mention = activity(%{"entities" => [%{"type" => "mention", "mentioned" => %{"id" => "28:someone-else"}}]})

      assert :ok = Teams.handle_activity(conn, no_mention)
      assert [] = Repo.all(ChatbotMessage)
    end

    test "ignores non-message activity types" do
      conn = teams_connection()

      assert :ok = Teams.handle_activity(conn, activity(%{"type" => "conversationUpdate"}))
      assert [] = Repo.all(ChatbotMessage)
    end

    test "does not create a job when no chatbot is bound to the channel" do
      conn = teams_connection()

      assert :ok = Teams.handle_activity(conn, activity())
      assert [] = Repo.all(ChatbotMessage)
    end
  end
end
