defmodule Console.AI.Chat do
  use Console.Services.Base
  import Console.AI.Policy
  import Console.AI.Evidence.Base, only: [prepend: 2]
  alias Console.AI.{Provider, Tools.Pr, Fixer}
  alias Console.Deployments.{Services, Stacks}
  alias Console.Schema.{
    AiInsight,
    Chat,
    ChatThread,
    ChatSequence,
    User,
    AiPin,
    PullRequest,
    Service,
    Stack
  }

  @type context_source :: :service | :stack
  @type thread_resp :: {:ok, ChatThread.t} | Console.error
  @type pin_resp :: {:ok, AiPin.t} | Console.error
  @type chat_list_resp :: {:ok, [Chat.t]} | Console.error
  @type chat_resp :: {:ok, Chat.t} | Console.error

  @context_window 128_000 * 4

  @rollup """
  The following is a chat history concerning a set of kubernetes or devops questions, usually encompassing topics like terraform,
  helm, GitOps, and other technologies and best practices.  Please summarize it in at most two paragraphs as an expert platform engineer
  describing the content to an inexperienced engineer unfamiliar with the space.
  """

  @summary """
  The following is a chat log about a topic in DevOps, focusing primarily on kubernetes and infrastructure as code issues.  Please take the text provided and turn it into a highly readable and intuitive 5 word or less summary.
  """

  @chat """
  The following is a chat history concerning a set of kubernetes or devops questions, usually encompassing topics like terraform,
  helm, GitOps, and other technologies and best practices.  Please provide a response suitable for a junior engineer
  with minimal infrastructure experience, providing as much documentation and links to supporting materials as possible.
  """

  @pr """
  The above is a chat log debugging a devops issue related to Kubernetes, Infrastructure as Code or general devops issues. Please spawn a
  Pull Request to fix the issue described above.  The code change should be the most direct and straightforward way to
  fix the issue described.  Change only the minimal amount of lines in the original files provided to successfully
  fix the issue, avoid any extraneous changes as they will potentially break additional functionality upon application.
  """

  def get_thread!(id), do: Repo.get!(ChatThread, id)

  def get_pin!(id), do: Repo.get!(AiPin, id)

  def default_thread!(%User{id: user_id} = user) do
    ChatThread.default()
    |> ChatThread.for_user(user_id)
    |> Repo.one()
    |> case do
      %ChatThread{} = t -> t
      _ -> make_default_thread!(user)
    end
  end

  def make_default_thread!(%User{id: uid}) do
    %ChatThread{user_id: uid}
    |> ChatThread.changeset(%{default: true, summary: "Your primary chat with Plural AI"})
    |> Repo.insert!()
  end

  @doc """
  Pins an ai-related item for future investigation
  """
  @spec create_pin(map, User.t) :: pin_resp
  def create_pin(attrs, %User{id: uid}) do
    %AiPin{user_id: uid}
    |> AiPin.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Deletes a users pin
  """
  @spec delete_pin(binary, User.t) :: pin_resp
  def delete_pin(id, %User{} = user) do
    get_pin!(id)
    |> allow(user, :delete)
    |> when_ok(:delete)
  end

  @doc """
  It can create a new chat thread
  """
  @spec create_thread(map, User.t) :: thread_resp
  def create_thread(attrs, %User{id: uid} = user) do
    start_transaction()
    |> add_operation(:thread, fn _ ->
      %ChatThread{user_id: uid}
      |> ChatThread.changeset(attrs)
      |> Repo.insert()
    end)
    |> maybe_save_messages(attrs, user)
    |> execute(extract: :thread)
  end

  @doc """
  Updates a thread
  """
  @spec update_thread(map, binary, User.t) :: thread_resp
  def update_thread(attrs, thread_id, %User{} = user) do
    get_thread!(thread_id)
    |> ChatThread.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
  end

  @doc """
  It can delete a thread
  """
  @spec delete_thread(binary, User.t) :: thread_resp
  def delete_thread(thread_id, %User{} = user) do
    get_thread!(thread_id)
    |> allow(user, :delete)
    |> when_ok(:delete)
  end

  @doc """
  Rolls up expired messages into a summary message to preserve history as best as possible
  """
  @spec rollup(ChatThread.t) :: {:ok, Chat.t} | Console.error
  def rollup(%ChatThread{id: tid, user_id: uid}) do
    chats = Chat.for_thread(tid)
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
      |> Enum.concat([%Chat{role: :user, content: "Please summarize the prior chat history in at most one or two paragraphs."}])
      |> fit_context_window(@rollup)
      |> Enum.map(&Chat.message/1)
      |> Provider.completion(preface: @rollup)
    end)
    |> add_operation(:summary, fn %{summarize: s} ->
      %Chat{user_id: uid, thread_id: tid}
      |> Chat.changeset(%{content: s, seq: -1, role: :system})
      |> Repo.insert()
    end)
    |> execute(extract: :summary, timeout: 300_000)
  end

  @doc """
  Will auto-generate a sentence-long summary for a thread
  """
  @spec summarize(ChatThread.t) :: {:ok, ChatThread.t} | Console.error
  def summarize(%ChatThread{} = thread) do
    Chat.for_thread(thread.id)
    |> Repo.all()
    |> Enum.concat([%Chat{role: :user, content: "Please summarize the prior chat history in at most one sentence."}])
    |> fit_context_window(@summary)
    |> Enum.map(&Chat.message/1)
    |> Provider.completion(preface: @summary)
    |> when_ok(fn summary ->
      ChatThread.changeset(thread, %{summarized: true, summary: summary})
      |> Repo.update()
    end)
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
  @spec clear(User.t, binary | nil, integer | nil) :: {:ok, integer} | Console.error
  def clear(%User{} = user, tid \\ nil, before \\ nil) do
    thread_id = tid || default_thread!(user).id

    Chat.for_thread(thread_id)
    |> Chat.before(before)
    |> Repo.delete_all()
    |> elem(0)
    |> ok()
  end

  @doc """
  Saves a message history, then generates a new assistant-derived messages from there
  """
  @spec chat([map], binary | nil, User.t) :: chat_resp
  def chat(messages, tid \\ nil, %User{} = user) do
    thread_id = tid || default_thread!(user).id
    start_transaction()
    |> add_operation(:access, fn _ -> thread_access(thread_id, user) end)
    |> add_operation(:save, fn _ -> save(messages, thread_id, user) end)
    |> add_operation(:chat, fn _ ->
      Chat.for_thread(thread_id)
      |> Chat.ordered()
      |> Repo.all()
      |> fit_context_window()
      |> Enum.map(&Chat.message/1)
      |> Provider.completion(preface: @chat)
    end)
    |> add_operation(:msg, fn %{chat: c} ->
      save_message(%{role: :assistant, content: c}, thread_id, user)
    end)
    |> add_operation(:bump, fn %{access: thread} ->
      ChatThread.changeset(thread, %{last_message_at: Timex.now()})
      |> Repo.update()
    end)
    |> execute(extract: :msg, timeout: 300_000)
  end

  @doc """
  Saves a set of messages to a users chat history
  """
  @spec save([map], binary | nil, User.t) :: chat_list_resp
  def save(messages, tid \\ nil, %User{} = user) do
    thread_id = tid || default_thread!(user).id
    start_transaction()
    |> add_operation(:thread, fn _ -> thread_access(thread_id, user) end)
    |> maybe_save_messages(messages, user)
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

  @doc """
  Adds context to the given chat thread from a source, eg a service or stack
  """
  @spec add_context(context_source, binary, binary, User.t) :: chat_list_resp
  def add_context(source_type, id, thread_id, %User{} = user) do
    Fixer.Base.raw()
    source = context_source(source_type, id)
    with {:ok, source} <- allow(source, user, :read),
         {:ok, _} <- thread_access(thread_id, user),
         {:ok, [_ | prompt]} <- context_prompt(source) do
      Enum.map(prompt, fn
        {role, %{file: f, content: c}} -> %{type: :file, role: role, content: c, attributes: %{file: %{name: f}}}
        {role, c} -> %{role: role, content: c}
      end)
      |> prepend(%{
        role: :user,
        content: "Please give me the full details of the Plural #{source_type} with name: #{source.name}"
      })
      |> save(thread_id, user)
    end
  end

  defp context_source(:service, id), do: Services.get_service!(id)
  defp context_source(:stack, id), do: Stacks.get_stack!(id)

  defp context_prompt(%Service{} = svc), do: Fixer.Service.prompt(svc, "")
  defp context_prompt(%Stack{} = stack), do: Fixer.Stack.prompt(stack, "")

  @doc """
  Generates a PR given the chat history in the input thread
  """
  @spec pr(binary, User.t) :: chat_resp
  def pr(thread_id, %User{} = user) do
    Console.AI.Tool.set_actor(user)
    with {:ok, thread} <- thread_access(thread_id, user) do
      Chat.for_thread(thread_id)
      |> Repo.all()
      |> fit_context_window()
      |> Enum.map(&Chat.message/1)
      |> Enum.concat([{:user, @pr}])
      |> Provider.tool_call([Pr])
      |> handle_tool_call(thread, user)
    end
  end

  defp handle_tool_call({:ok, [%{create_pr: %{result: pr_attrs}} | _]}, %ChatThread{} = thread, user) do
    thread = Repo.preload(thread, [:insight])
    start_transaction()
    |> add_operation(:pr, fn _ ->
      %PullRequest{}
      |> PullRequest.changeset(Map.merge(pr_attrs, pr_attrs(thread)))
      |> Repo.insert()
    end)
    |> add_operation(:msg, fn %{pr: %{id: id}} ->
      msg("Ok I created the PR for you, here it is")
      |> Map.put(:pull_request_id, id)
      |> save_message(thread.id, user)
    end)
    |> add_operation(:bump, fn _ ->
      ChatThread.changeset(thread, %{last_message_at: Timex.now()})
      |> Repo.update()
    end)
    |> execute(extract: :msg)
  end
  defp handle_tool_call({:ok, [%{create_pr: %{error: err}} | _]}, _, _), do: {:error, err}
  defp handle_tool_call({:ok, txt}, %ChatThread{id: tid}, user), do: save_message(msg(txt), tid, user)
  defp handle_tool_call(err, _, _), do: err

  defp pr_attrs(%ChatThread{insight: %AiInsight{} = insight}), do: Map.take(insight, ~w(service_id stack_id cluster_id)a)
  defp pr_attrs(_), do: %{}

  def thread_access(tid, %User{} = user) do
    get_thread!(tid)
    |> allow(user, :read)
  end

  def backfill_thread(%User{} = user) do
    start_transaction()
    |> add_operation(:thread, fn _ -> {:ok, make_default_thread!(user)} end)
    |> add_operation(:chats, fn %{thread: %{id: tid}} ->
      Chat.for_user(user.id)
      |> Repo.update_all(set: [thread_id: tid])
      |> ok()
    end)
    |> execute(extract: :thread)
  end

  def backfill_threads() do
    User.with_chats()
    |> Repo.all()
    |> Enum.each(&backfill_thread/1)
  end

  defp maybe_save_messages(xact, [_ | _] = msgs, user) do
    Enum.with_index(msgs)
    |> Enum.reduce(xact, fn {msg, ind}, xact ->
      add_operation(xact, {:msg, ind}, fn %{thread: %{id: tid}} ->
        save_message(msg, tid, user)
      end)
    end)
  end
  defp maybe_save_messages(xact, %{messages: [_ | _] = msgs}, user), do: maybe_save_messages(xact, msgs, user)
  defp maybe_save_messages(xact, _, _), do: xact

  defp save_message(message, thread_id, %User{id: uid} = user) do
    start_transaction()
    |> add_operation(:counter, fn _ -> chat_counter(user, thread_id) end)
    |> add_operation(:msg, fn %{counter: %{counter: counter}} ->
      %Chat{user_id: uid, thread_id: thread_id}
      |> Chat.changeset(Map.put(message, :seq, counter))
      |> Repo.insert()
    end)
    |> execute(extract: :msg)
  end

  defp chat_counter(%User{id: uid}, thread_id) do
    Repo.insert(
      %ChatSequence{user_id: uid, thread_id: thread_id},
      returning: [:counter],
      conflict_target: :thread_id,
      on_conflict: [inc: [counter: 1]]
    )
  end

  defp fit_context_window(msgs, preface \\ @chat) do
    Enum.reduce(msgs, byte_size(preface), &byte_size(&1.content) + &2)
    |> trim_messages(msgs)
  end

  defp trim_messages(total, msgs) when total < @context_window, do: msgs
  defp trim_messages(_, [%Chat{}] = msgs), do: msgs
  defp trim_messages(_, [] = msgs), do: msgs
  defp trim_messages(total, [%Chat{content: content} | rest]),
    do: trim_messages(total - byte_size(content), rest)

  defp msg(text), do: %{role: :assistant, content: text}
end
