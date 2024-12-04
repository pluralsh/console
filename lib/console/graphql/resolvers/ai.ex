defmodule Console.GraphQl.Resolvers.AI do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.AiInsight
  alias Console.AI.Chat, as: ChatSvc
  alias Console.AI.Stream
  alias Console.AI.{Provider, Fixer}
  alias Console.Schema.{Chat, ChatThread, AiPin}
  alias Console.Deployments.Clusters
  alias Console.GraphQl.Resolvers.Kubernetes

  def query(Chat, _), do: Chat
  def query(ChatThread, _), do: ChatThread
  def query(AiPin, _), do: AiPin
  def query(_, _), do: AiInsight

  def resolve_pin(args, %{context: %{current_user: user}}) do
    args = Enum.filter([user_id: user.id] ++ Map.to_list(args), fn {_, v} -> not is_nil(v) end)
    {:ok, Console.Repo.get_by!(AiPin, args)}
  end

  def pins(args, %{context: %{current_user: user}}) do
    AiPin.for_user(user.id)
    |> AiPin.ordered()
    |> paginate(args)
  end

  def threads(args, %{context: %{current_user: user}}) do
    ChatThread.for_user(user.id)
    |> ChatThread.ordered()
    |> paginate(args)
  end

  def thread(%{id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.thread_access(id, user)

  def chats(args, %{context: %{current_user: user}}) do
    with {:ok, q} <- maybe_thread(args, user) do
      Chat.ordered(q)
      |> paginate(args)
    end
  end

  def list_chats(%ChatThread{id: tid}, args, _) do
    Chat.for_thread(tid)
    |> Chat.ordered()
    |> paginate(args)
  end

  defp maybe_thread(%{thread_id: tid}, user) when is_binary(tid) do
    with {:ok, _} <- ChatSvc.thread_access(tid, user),
      do: {:ok, Chat.for_thread(tid)}
  end

  defp maybe_thread(_, user) do
    thread = ChatSvc.default_thread!(user)
    {:ok, Chat.for_thread(thread.id)}
  end

  def resolve_cluster_insight_component(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.insight_component(id, user)

  def ai_completion(%{system: system, input: input} = args, %{context: %{current_user: user}}) when is_binary(input) do
    maybe_stream(args, user)
    Provider.completion([{:user, input}], preface: system)
  end

  def ai_completion(%{system: system, chat: chat} = args, %{context: %{current_user: user}}) when is_list(chat) do
    maybe_stream(args, user)

    Enum.map(chat, fn %{role: r, content: c} -> {r, c} end)
    |> Provider.completion(preface: system)
  end
  def ai_completion(_, _), do: {:error, "need to pass either a raw input or a chat history"}

  defp maybe_stream(args, user) do
    if is_binary(args[:scope_id]) do
      Stream.topic(:freeform, args[:scope_id], user)
      |> Stream.enable()
    end
  end

  def ai_suggested_fix(%{insight_id: id}, %{context: %{current_user: user}}) do
    Stream.topic(:insight, id, user)
    |> Stream.enable()

    Fixer.fix(id, user)
  end

  def fix_pr(%{insight_id: id, messages: chat}, %{context: %{current_user: user}}) do
    Fixer.pr(id, Enum.map(chat || [], fn %{role: r, content: c} -> {r, c} end), user)
  end

  def save_chats(%{messages: msgs} = args, %{context: %{current_user: user}}),
    do: ChatSvc.save(msgs, args[:thread_id], user)

  def chat(%{messages: msgs} = args, %{context: %{current_user: user}}) do
    Stream.topic(:thread, args[:thread_id], user)
    |> Stream.enable()

    ChatSvc.chat(msgs, args[:thread_id], user)
  end

  def clear_chats(args, %{context: %{current_user: user}}),
    do: ChatSvc.clear(user, args[:thread_id], args[:before])

  def delete_chat(%{id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.delete(id, user)

  def create_thread(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: ChatSvc.create_thread(attrs, user)

  def update_thread(%{attributes: attrs, id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.update_thread(attrs, id, user)

  def delete_thread(%{id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.delete_thread(id, user)

  def create_pin(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: ChatSvc.create_pin(attrs, user)

  def delete_pin(%{id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.delete_pin(id, user)

  def raw_resource(%{version: v, kind: k, name: n} = comp, _, _) do
    cluster = Console.Repo.preload(comp, [:cluster])
    Kube.Utils.save_kubeconfig(cluster)

    kind = Kubernetes.get_kind(cluster, comp.group, v, k)
    path = Kube.Client.Base.path(comp.group, v, kind, comp.namespace, n)
    with {:ok, res} <- Kube.Client.raw(path) do
      {:ok, %{raw: res, kind: k, version: v, group: comp.group, metadata: Kube.Utils.raw_meta(res)}}
    end
  end
end
