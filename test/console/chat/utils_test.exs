defmodule Console.Chat.UtilsTest do
  use Console.DataCase, async: true
  alias Console.Chat.Utils
  alias Console.Chat.Reference
  alias Console.Repo

  describe "handle_mention/4" do
    test "creates a workbench job when a matching chatbot exists" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      conn = insert(:chat_connection)
      channel = "general"
      channel_id = "C01234567"
      custom_prompt = "Always be helpful"
      message = "<@U123> please fix the deploy"

      insert(:workbench_chatbot,
        workbench: workbench,
        chat_connection: conn,
        user: user,
        channel: channel,
        prompt: custom_prompt
      )

      {:ok, job} = Utils.handle_mention(
        %Reference{id: message, text: message},
        %Reference{id: channel_id, text: channel},
        conn
      )

      assert job.workbench_id == workbench.id
      assert job.user_id == user.id
      assert job.status == :pending
      assert job.prompt =~ message
      assert job.prompt =~ channel_id
      assert job.prompt =~ custom_prompt

      job = Repo.preload(job, :chatbot_message)

      assert job.chatbot_message.message == message
      assert job.chatbot_message.channel == channel
      assert job.chatbot_message.chat_connection_id == conn.id
    end
  end
end
