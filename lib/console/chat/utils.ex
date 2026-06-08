defmodule Console.Chat.Utils do
  alias Console.Chat.Reference
  alias Console.Schema.{WorkbenchChatbot, ChatConnection, User}
  alias Console.Deployments.Workbenches
  alias Console.Repo

  require EEx

  def handle_mention(%Reference{} = msg, %Reference{text: channel} = chan_ref, %ChatConnection{id: id} = conn) do
    Workbenches.workbench_chatbot(id, channel)
    |> Repo.preload([user: [:groups]])
    |> case do
      %WorkbenchChatbot{user: %User{}  = user, prompt: prompt, message_behavior: behavior} = chatbot ->
        Workbenches.create_workbench_job(%{
          prompt: prompt(chat: conn, msg: msg, channel: chan_ref, custom: prompt, behavior: behavior),
          workbench_id: chatbot.workbench_id,
          modes: Console.mapify(chatbot.modes),
          chatbot_message: %{message: msg.text, channel: channel, chat_connection_id: id}
        }, chatbot.workbench_id, user)
      nil -> :ok
    end
  end

  EEx.function_from_file(:defp, :prompt, Console.priv_filename(["prompts", "workbench", "chat.md.eex"]), [:assigns])
end
