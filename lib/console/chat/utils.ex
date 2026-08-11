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

  def handle_mention(%Reference{} = msg, %Reference{} = chan_ref, %ChatConnection{} = conn),
    do: handle_mention(msg, chan_ref, conn, %{})

  @doc """
  Looks up the workbench chatbot bound to the mentioned channel and, if found, spawns a workbench job for the
  request (or appends to the in-flight parent job when the mention is a threaded reply).  `extra` is merged into
  the persisted `ChatbotMessage`, letting providers stash reply coordinates (e.g. teams
  `service_url`/`conversation_id`/`activity_id`) needed to respond out-of-band.
  """
  def handle_mention(%Reference{id: external_id} = msg, %Reference{text: channel} = chan_ref, %ChatConnection{id: id} = conn, %{} = extra) do
    bot = Workbenches.workbench_chatbot(id, channel) |> Repo.preload([user: [:groups]])
    with %WorkbenchChatbot{user: %User{} = user, prompt: custom, message_behavior: behavior} = chatbot <- bot do
      case parent_job(msg) do
        %WorkbenchJob{} = job ->
          prompt = reply_prompt(chat: conn, msg: msg, channel: chan_ref, custom: custom, job: job)

          Workbenches.create_queued_prompt(%{
            prompt: prompt,
            dequeable_at: DateTime.utc_now()
          }, job, user)

        _ ->
          prompt = prompt(chat: conn, msg: msg, channel: chan_ref, custom: custom, behavior: behavior)

          chatbot_message =
            Map.merge(%{
              message: msg.text,
              channel: channel,
              chat_connection_id: id,
              external_id: external_id,
              external_parent_id: msg.parent_id
            }, extra)

          Workbenches.create_workbench_job(%{
            prompt: prompt,
            workbench_id: chatbot.workbench_id,
            modes: Console.mapify(chatbot.modes),
            chatbot_message: chatbot_message
          }, Workbenches.get_workbench!(chatbot.workbench_id), user)
      end
    else
      _ -> :ok
    end
  end

  defp parent_job(%Reference{parent_id: id}) when is_binary(id) do
    chatbot_msg(id)
    |> Repo.preload(:workbench_job, force: true)
    |> case do
      %ChatbotMessage{workbench_job: %WorkbenchJob{} = job} -> job
      _ -> nil
    end
  end
  defp parent_job(%Reference{parent_id: nil}), do: nil

  defp cache_id(%ChatbotMessage{external_id: id}) when is_binary(id), do: id
  defp cache_id(%ChatbotMessage{id: id}), do: id

  EEx.function_from_file(:defp, :prompt, Console.priv_filename(["prompts", "workbench", "chat.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :reply_prompt, Console.priv_filename(["prompts", "workbench", "chat_reply.md.eex"]), [:assigns])
end
