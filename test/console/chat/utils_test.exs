defmodule Console.Chat.UtilsTest do
  use Console.DataCase, async: true

  alias Console.Chat.{Reference, Utils}
  alias Console.Schema.{ChatbotMessage, WorkbenchJob, WorkbenchJobActivity}

  describe "handle_mention/3" do
    test "creates a workbench job for a new chatbot mention" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      conn = insert(:chat_connection)
      channel = "chat-channel"
      channel_id = "C123"
      custom_prompt = "Always be helpful"

      insert(:workbench_chatbot,
        channel: channel,
        chat_connection: conn,
        workbench: workbench,
        user: user,
        prompt: custom_prompt
      )

      msg = %Reference{id: "1730000000.000001", text: "<@bot> investigate this"}
      chan_ref = %Reference{id: channel_id, text: channel}

      {:ok, %WorkbenchJob{} = job} = Utils.handle_mention(msg, chan_ref, conn)

      assert job.workbench_id == workbench.id
      assert job.user_id == user.id
      assert job.prompt =~ msg.text
      assert job.prompt =~ channel_id
      assert job.prompt =~ custom_prompt

      chatbot_msg = Repo.get_by!(ChatbotMessage, workbench_job_id: job.id)
      assert chatbot_msg.message == msg.text
      assert chatbot_msg.channel == channel
      assert chatbot_msg.chat_connection_id == conn.id
      assert chatbot_msg.external_id == msg.id
      refute chatbot_msg.external_parent_id
    end

    test "creates a job message for a reply to a prior chatbot message" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      conn = insert(:chat_connection)
      channel = "chat-channel"
      parent_ts = "1730000000.000001"

      insert(:workbench_chatbot,
        channel: channel,
        chat_connection: conn,
        workbench: workbench,
        user: user
      )

      job =
        insert(:workbench_job,
          status: :successful,
          user: user,
          workbench: workbench
        )

      insert(:chatbot_message,
        external_id: parent_ts,
        chat_connection: conn,
        workbench_job: job
      )

      msg = %Reference{
        id: "1730000001.000002",
        parent_id: parent_ts,
        text: "<@bot> follow up on this"
      }

      {:ok, %WorkbenchJobActivity{} = activity} =
        Utils.handle_mention(msg, %Reference{id: "C123", text: channel}, conn)

      assert activity.workbench_job_id == job.id
      assert activity.user_id == user.id
      assert activity.type == :user
      assert activity.status == :successful
      assert activity.prompt =~ msg.text
      assert refetch(job).status == :pending
    end
  end
end
