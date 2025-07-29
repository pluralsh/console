defmodule Console.GraphQl.Resolvers.AI do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.AiInsight
  import Console.GraphQl.Resolvers.Deployments.Base, only: [maybe_search: 3]
  alias Console.AI.Chat, as: ChatSvc
  alias Console.AI.Stream
  alias Console.AI.{Service, Provider, Fixer}
  alias Console.Schema.{Chat, ChatThread, AiPin, AiInsightEvidence, AgentSession}
  alias Console.Deployments.Clusters
  alias Console.GraphQl.Resolvers.Kubernetes

  def query(Chat, _), do: Chat
  def query(ChatThread, _), do: ChatThread
  def query(AiPin, _), do: AiPin
  def query(AiInsightEvidence, _), do: AiInsightEvidence
  def query(AgentSession, _), do: AgentSession
  def query(_, _), do: AiInsight

  def resolve_insight(%{id: id}, %{context: %{current_user: user}}),
    do: Service.authorized(id, user)

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
    |> thread_filters(args)
    |> maybe_search(ChatThread, args)
    |> paginate(args)
  end

  def sessions(args, %{context: %{current_user: user}}) do
    AgentSession.for_user(user.id)
    |> AgentSession.agent()
    |> AgentSession.ordered()
    |> paginate(args)
  end

  def thread(%{id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.thread_access(id, user)

  def chats(args, %{context: %{current_user: user}}) do
    with {:ok, q} <- maybe_thread(args, user) do
      Chat.ordered(q, chat_order(args))
      |> paginate(args)
    end
  end

  defp chat_order(%{reverse: true}), do: [desc: :seq, desc: :inserted_at]
  defp chat_order(_), do: [asc: :seq, asc: :inserted_at]

  def chat_tools(%{id: id}, _, %{context: %{current_user: user}}),
    do: ChatSvc.tools(id, user)

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

  def mcp_token(_, %{context: %{current_user: user}}) do
    with {:ok, token, _} <- Console.Jwt.MCP.mint(user),
      do: {:ok, token}
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

  def hybrid_chat(%{messages: msgs} = args, %{context: %{current_user: user}}) do
    Stream.topic(:thread, args[:thread_id], user)
    |> Stream.enable()

    ChatSvc.hybrid_chat(msgs, args[:thread_id], user)
  end

  def confirm_chat(%{id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.confirm_chat(id, user)

  def confirm_plan(%{thread_id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.confirm_plan(id, user)

  def cancel_chat(%{id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.cancel_chat(id, user)

  def thread_pr(%{thread_id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.pr(id, user)

  def add_context(%{thread_id: id, source: source} = args, %{context: %{current_user: user}}),
    do: ChatSvc.add_context(source, args[:source_id], id, user)

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

  def clone_thread(%{id: id} = args, %{context: %{current_user: user}}),
    do: ChatSvc.clone_thread(args[:seq], id, user)

  def create_pin(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: ChatSvc.create_pin(attrs, user)

  def delete_pin(%{id: id}, %{context: %{current_user: user}}),
    do: ChatSvc.delete_pin(id, user)

  def create_agent_session(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: ChatSvc.create_agent_session(attrs, user)

  def raw_resource(%{version: v, kind: k, name: n, group: g} = comp, _, _) do
    %{cluster: cluster} = comp = Console.Repo.preload(comp, [:cluster])
    Clusters.control_plane(cluster) |> Kube.Utils.save_kubeconfig()

    kind = Kubernetes.get_kind(cluster, g, v, k)
    path = Kube.Client.Base.path(g, v, kind, comp.namespace, n)
    with {:ok, res} <- Kube.Client.raw(path) do
      {:ok, %{raw: res, kind: k, version: v, group: g, metadata: Kube.Utils.raw_meta(res)}}
    end
  end

  defp thread_filters(query, args) do
    Enum.reduce(args, query, fn
      {:flow_id, fid}, q when is_binary(fid) ->
        ChatThread.for_flow(q, fid)
      _, q -> q
    end)
  end
end
