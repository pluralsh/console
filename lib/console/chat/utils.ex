defmodule Console.Chat.Utils do
  alias Console.Chat.Reference
  alias Console.Schema.{
    WorkbenchChatbot,
    WorkbenchJob,
    ChatConnection,
    User,
    ChatbotMessage
  }
  alias Console.Deployments.Workbenches
  alias Console.Repo
  use Nebulex.Caching

  require EEx

  @cache Console.conf(:cache_adapter)

  @decorate cacheable(cache: @cache, key: {:chatbot_msg, id}, opts: [ttl: :timer.hours(24)])
  def chatbot_msg(id), do: Repo.get_by(ChatbotMessage, external_id: id)

  def cache_msg(%ChatbotMessage{} = msg), do: @cache.put({:chatbot_msg, cache_id(msg)}, msg, ttl: :timer.hours(24))

  def handle_mention(%Reference{id: external_id} = msg, %Reference{text: channel} = chan_ref, %ChatConnection{id: id} = conn) do
    bot = Workbenches.workbench_chatbot(id, channel) |> Repo.preload([user: [:groups]])
    with %WorkbenchChatbot{user: %User{} = user, prompt: prompt, message_behavior: behavior} = chatbot <- bot do
      prompt = prompt(chat: conn, msg: msg, channel: chan_ref, custom: prompt, behavior: behavior)
      case parent_job(msg) do
        %WorkbenchJob{} = job -> Workbenches.create_message(%{prompt: prompt}, job, user)
        _ ->
          Workbenches.create_workbench_job(%{
            prompt: prompt,
            workbench_id: chatbot.workbench_id,
            modes: Console.mapify(chatbot.modes),
            chatbot_message: %{
              message: msg.text,
              channel: channel,
              chat_connection_id: id,
              external_id: external_id,
              external_parent_id: msg.parent_id
            }
          }, chatbot.workbench_id, user)
      end
    else
      _ -> :ok
    end
  end

  defp parent_job(%Reference{parent_id: id}) when is_binary(id) do
    chatbot_msg(id)
    |> Repo.preload(:workbench_job, force: true)
    |> case do
      %ChatbotMessage{workbench_job: %WorkbenchJob{status: s} = job} when s not in ~w(running pending)a -> job
      _ -> nil
    end
  end
  defp parent_job(%Reference{parent_id: nil}), do: nil

  defp cache_id(%ChatbotMessage{external_id: id}) when is_binary(id), do: id
  defp cache_id(%ChatbotMessage{id: id}), do: id

  EEx.function_from_file(:defp, :prompt, Console.priv_filename(["prompts", "workbench", "chat.md.eex"]), [:assigns])
end
