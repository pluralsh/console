defmodule Console.Chat.Impl.TeamsTest do
  use Console.DataCase, async: true
  alias Console.Chat.Impl.Teams
  alias Console.Schema.{ChatbotMessage, QueuedPrompt}
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
        "conversation" => %{"id" => @channel_id},
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

  defp bound_job(external_id, opts \\ []) do
    user = insert(:user)
    workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
    conn = teams_connection()

    insert(:workbench_chatbot,
      workbench: workbench,
      chat_connection: conn,
      user: user,
      channel: @channel_id
    )

    job =
      insert(:workbench_job,
        status: Keyword.get(opts, :status, :successful),
        user: user,
        workbench: workbench
      )

    insert(:chatbot_message,
      external_id: external_id,
      channel: @channel_id,
      chat_connection: conn,
      workbench_job: job,
      service_url: "https://smba.trafficmanager.net/amer/",
      conversation_id: @channel_id,
      activity_id: external_id
    )

    %{conn: conn, job: job, user: user}
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
      assert msg.conversation_id == @channel_id
      assert msg.activity_id == "activity-1"
      assert msg.external_id == "activity-1"
      refute msg.external_parent_id
    end

    test "queues a prompt when an @mention replies to the message that started a job" do
      root = "root-#{System.unique_integer([:positive])}"
      %{conn: conn, job: job} = bound_job(root)

      reply =
        activity(%{
          "id" => "reply-activity",
          "text" => "<at>Console Bot</at> follow up on this",
          "replyToId" => root,
          "conversation" => %{"id" => "#{@channel_id};messageid=#{root}"}
        })

      assert :ok = Teams.handle_activity(conn, reply)

      assert [%QueuedPrompt{} = prompt] = Repo.all(QueuedPrompt)
      assert prompt.workbench_job_id == job.id
      assert prompt.prompt =~ "follow up on this"
      assert prompt.prompt =~ "teams_reply"
      refute prompt.prompt =~ "Be sure to react"
      assert Repo.aggregate(ChatbotMessage, :count) == 1
      assert refetch(job).status == :successful
    end

    test "queues a prompt when the thread root is only on the conversation id" do
      root = "root-#{System.unique_integer([:positive])}"
      %{conn: conn, job: job} = bound_job(root, status: :running)

      reply =
        activity(%{
          "id" => "reply-activity",
          "text" => "<at>Console Bot</at> follow up while running",
          "conversation" => %{"id" => "#{@channel_id};messageid=#{root}"}
        })

      assert :ok = Teams.handle_activity(conn, reply)

      assert [%QueuedPrompt{} = prompt] = Repo.all(QueuedPrompt)
      assert prompt.workbench_job_id == job.id
      assert prompt.prompt =~ "follow up while running"
      assert Repo.aggregate(ChatbotMessage, :count) == 1
      assert refetch(job).status == :running
    end

    test "starts a new job when the thread root is not a chatbot message" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      conn = teams_connection()

      insert(:workbench_chatbot,
        workbench: workbench,
        chat_connection: conn,
        user: user,
        channel: @channel_id
      )

      reply =
        activity(%{
          "id" => "reply-activity",
          "text" => "<at>Console Bot</at> new request",
          "replyToId" => "someone-elses-message",
          "conversation" => %{"id" => "#{@channel_id};messageid=someone-elses-message"}
        })

      assert :ok = Teams.handle_activity(conn, reply)

      assert [%ChatbotMessage{} = msg] = Repo.all(ChatbotMessage)
      assert msg.external_id == "reply-activity"
      assert msg.external_parent_id == "someone-elses-message"
      assert msg.conversation_id == "#{@channel_id};messageid=someone-elses-message"
      assert msg.message == "new request"
      assert [] = Repo.all(QueuedPrompt)
    end

    test "ignores a thread reply that does not mention the bot" do
      root = "root-#{System.unique_integer([:positive])}"
      %{conn: conn} = bound_job(root)

      reply =
        activity(%{
          "id" => "reply-activity",
          "text" => "just chatting",
          "replyToId" => root,
          "entities" => [%{"type" => "mention", "mentioned" => %{"id" => "28:someone-else"}}]
        })

      assert :ok = Teams.handle_activity(conn, reply)

      assert [] = Repo.all(QueuedPrompt)
      assert Repo.aggregate(ChatbotMessage, :count) == 1
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
