defmodule Console.Chat.Utils do
  alias Console.Chat.Reference
  alias Console.Schema.{WorkbenchChatbot, ChatConnection, User}
  alias Console.Deployments.Workbenches
  alias Console.Repo

  require EEx

  def handle_mention(%Reference{} = msg, %Reference{} = chan_ref, %ChatConnection{} = conn),
    do: handle_mention(msg, chan_ref, conn, %{})

  @doc """
  Looks up the workbench chatbot bound to the mentioned channel and, if found, spawns a workbench job for the
  request. `extra` is merged into the persisted `ChatbotMessage`, letting providers stash reply coordinates
  (e.g. teams `service_url`/`conversation_id`/`activity_id`) needed to respond out-of-band.
  """
  def handle_mention(%Reference{} = msg, %Reference{text: channel} = chan_ref, %ChatConnection{id: id} = conn, %{} = extra) do
    Workbenches.workbench_chatbot(id, channel)
    |> Repo.preload([user: [:groups]])
    |> case do
      %WorkbenchChatbot{user: %User{}  = user, prompt: prompt, message_behavior: behavior} = chatbot ->
        chatbot_message =
          Map.merge(%{message: msg.text, channel: channel, chat_connection_id: id}, extra)

        Workbenches.create_workbench_job(%{
          prompt: prompt(chat: conn, msg: msg, channel: chan_ref, custom: prompt, behavior: behavior),
          workbench_id: chatbot.workbench_id,
          modes: Console.mapify(chatbot.modes),
          chatbot_message: chatbot_message
        }, chatbot.workbench_id, user)
      nil -> :ok
    end
  end

  EEx.function_from_file(:defp, :prompt, Console.priv_filename(["prompts", "workbench", "chat.md.eex"]), [:assigns])
end
