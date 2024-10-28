defmodule Console.GraphQl.Resolvers.AI do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.AiInsight
  alias Console.AI.Chat, as: ChatSvc
  alias Console.AI.{Provider, Fixer}
  alias Console.Schema.Chat

  def chats(args, %{context: %{current_user: user}}) do
    Chat.for_user(user.id)
    |> Chat.ordered()
    |> paginate(args)
  end

  def ai_completion(%{system: system, input: input}, _) when is_binary(input) do
    Provider.completion([{:user, input}], preface: system)
  end

  def ai_completion(%{system: system, chat: chat}, _) when is_list(chat) do
    Enum.map(chat, fn %{role: r, content: c} -> {r, c} end)
    |> Provider.completion(preface: system)
  end

  def ai_completion(_, _), do: {:error, "need to pass either a raw input or a chat history"}

  def ai_suggested_fix(%{insight_id: id}, %{context: %{current_user: user}}),
    do: Fixer.fix(id, user)

  def save_chats(%{messages: msgs}, %{context: %{current_user: user}}),
    do: ChatSvc.save(msgs, user)

  def chat(%{messages: msgs}, %{context: %{current_user: user}}),
    do: ChatSvc.chat(msgs, user)

  def clear_chats(_, %{context: %{current_user: user}}),
    do: ChatSvc.clear(user)

  def delete_chat(%{id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.delete(id, user)
end
