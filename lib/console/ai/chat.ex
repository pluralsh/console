defmodule Console.AI.Chat do
  use Console.Services.Base
  import Console.AI.Policy
  alias Console.AI.Provider
  alias Console.Schema.{Chat, ChatSequence, User}

  @context_window 128_000 * 4

  @summary """
  The following is a chat history concerning a set of kubernetes or devops questions, usually encompassing topics like terraform,
  helm, GitOps, and other technologies and best practices.  Please summarize it in at most two paragraphs as an expert platform engineer
  describing the content to an inexperienced engineer unfamiliar with the space.
  """

  @chat """
  The following is a chat history concerning a set of kubernetes or devops questions, usually encompassing topics like terraform,
  helm, GitOps, and other technologies and best practices.  Please provide a response suitable for a junior engineer
  with minimal infrastructure experience, providing as much documentation and links to supporting materials as possible.
  """

  @doc """
  Rolls up expired messages into a summary message to preserve history as best as possible
  """
  @spec rollup(User.t) :: {:ok, Chat.t} | Console.error
  def rollup(%User{id: uid}) do
    chats = Chat.for_user(uid)
    start_transaction()
    |> add_operation(:eligible, fn _ ->
      Chat.expired(chats)
      |> Repo.exists?()
      |> case do
        true -> {:ok, true}
        _ -> {:error, "no chats to rollup"}
      end
    end)
    |> add_operation(:expire, fn _ ->
      Chat.summarizable(chats)
      |> Chat.selected()
      |> Repo.delete_all()
      |> elem(1)
      |> ok()
    end)
    |> add_operation(:summarize, fn %{expire: chats} ->
      Enum.sort_by(chats, & &1.seq)
      |> Enum.map(fn %{role: r, content: t} -> {r, t} end)
      |> Provider.completion(preface: @summary)
    end)
    |> add_operation(:summary, fn %{summarize: s} ->
      %Chat{user_id: uid}
      |> Chat.changeset(%{content: s, seq: -1, role: :system})
      |> Repo.insert()
    end)
    |> execute(extract: :summary, timeout: 300_000)
  end

  @doc """
  It can delete a chat message, if you were the author
  """
  @spec delete(binary, User.t) :: {:ok, Chat.t} | Console.error
  def delete(id, %User{} = user) do
    Repo.get!(Chat, id)
    |> allow(user, :delete)
    |> when_ok(:delete)
  end

  @doc """
  Clears the chat history for a user
  """
  @spec clear(User.t) :: {:ok, integer} | Console.error
  def clear(%User{id: uid}) do
    Chat.for_user(uid)
    |> Repo.delete_all()
    |> elem(0)
    |> ok()
  end

  @doc """
  Saves a message history, then generates a new assistant-derived messages from there
  """
  @spec chat([map], User.t) :: {:ok, Chat.t} | Console.error
  def chat(messages, %User{id: uid} = user) do
    start_transaction()
    |> add_operation(:save, fn _ -> save(messages, user) end)
    |> add_operation(:chat, fn _ ->
      Chat.for_user(uid)
      |> Chat.ordered()
      |> Repo.all()
      |> fit_context_window()
      |> Enum.map(fn %Chat{role: r, content: c} -> {r, c} end)
      |> Provider.completion(preface: @chat)
    end)
    |> add_operation(:msg, fn %{chat: c} ->
      save_message(%{role: :assistant, content: c}, user)
    end)
    |> execute(extract: :msg, timeout: 300_000)
  end

  @doc """
  Saves a set of messages to a users chat history
  """
  @spec save([map], User.t) :: {:ok, [Chat.t]} | Console.error
  def save(messages, %User{} = user) do
    Enum.with_index(messages)
    |> Enum.reduce(start_transaction(), fn {message, ind}, xact ->
      add_operation(xact, {:msg, ind}, fn _ ->
        save_message(message, user)
      end)
    end)
    |> execute()
    |> when_ok(fn results ->
      Enum.filter(results, fn
        {{:msg, _}, _} -> true
        _ -> false
      end)
      |> Enum.map(&elem(&1, 1))
      |> Enum.sort_by(& &1.seq)
    end)
  end

  defp save_message(message, %User{id: uid} = user) do
    start_transaction()
    |> add_operation(:counter, fn _ -> chat_counter(user) end)
    |> add_operation(:msg, fn %{counter: %{counter: counter}} ->
      %Chat{user_id: uid}
      |> Chat.changeset(Map.put(message, :seq, counter))
      |> Repo.insert()
    end)
    |> execute(extract: :msg)
  end

  defp chat_counter(%User{id: uid}) do
    Repo.insert(
      %ChatSequence{user_id: uid},
      returning: [:counter],
      conflict_target: :user_id,
      on_conflict: [inc: [counter: 1]]
    )
  end

  defp fit_context_window(msgs) do
    Enum.reduce(msgs, byte_size(@chat), &byte_size(&1.content) + &2)
    |> trim_messages(msgs)
  end

  defp trim_messages(total, msgs) when total < @context_window, do: msgs
  defp trim_messages(_, [%Chat{}] = msgs), do: msgs
  defp trim_messages(_, [] = msgs), do: msgs
  defp trim_messages(total, [%Chat{content: content} | rest]),
    do: trim_messages(total - byte_size(content), rest)
end
