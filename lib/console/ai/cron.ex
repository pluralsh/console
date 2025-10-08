defmodule Console.AI.Cron do
  import Console.Services.Base, only: [handle_notify: 2]
  alias Console.{Repo, PubSub}
  alias Console.AI.{Worker, Chat, VectorStore}
  alias Console.Deployments.Settings
  alias Console.Schema.{
    Alert,
    AiInsight,
    Stack,
    Service,
    Cluster,
    DeploymentSettings,
    ChatThread,
    McpServerAudit,
    AgentRun,
    SentinelRun
  }

  require Logger

  @chunk 100

  def trim() do
    AiInsight.expired()
    |> Repo.delete_all()
  end

  def trim_threads() do
    ChatThread.prunable()
    |> Repo.delete_all()
  end

  def trim_mcp_logs() do
    McpServerAudit.expired()
    |> Repo.delete_all()
  end

  def trim_runs() do
    AgentRun.expired()
    |> Repo.delete_all()
  end

  def trim_sentinel_runs() do
    SentinelRun.expired()
    |> Repo.delete_all()
  end

  def services() do
    if_enabled(fn ->
      Service.for_statuses([:failed, :stale])
      |> Service.stable()
      |> Service.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
      |> Console.throttle()
      |> Stream.chunk_every(@chunk)
      |> Stream.map(&batch_insight(PubSub.ServiceInsight, &1))
      |> Stream.run()
    end)
  end

  def stacks() do
    if_enabled(fn ->
      Stack.for_status(:failed)
      |> Stack.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
      |> Console.throttle()
      |> Stream.chunk_every(@chunk)
      |> Stream.map(&batch_insight(PubSub.StackInsight, &1))
      |> Stream.run()
    end)
  end

  def clusters() do
    if_enabled(fn ->
      Cluster.with_insight_components()
      |> Cluster.ordered(asc: :id)
      |> Cluster.preloaded([:insight, insight_components: [:insight, :cluster]])
      |> Repo.stream(method: :keyset)
      |> Console.throttle()
      |> Stream.chunk_every(@chunk)
      |> Stream.map(&batch_insight(PubSub.ClusterInsight, &1))
      |> Stream.run()
    end)
  end

  def alerts() do
    if_enabled(fn ->
      Alert.firing()
      |> Alert.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
      |> Console.throttle()
      |> Stream.chunk_every(@chunk)
      |> Stream.map(&batch_insight(PubSub.AlertInsight, &1))
      |> Stream.run()
    end)
  end

  def chats() do
    if_enabled(fn ->
      ChatThread.with_expired_chats()
      |> ChatThread.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
      |> Flow.from_enumerable(stages: 20)
      |> Flow.map(&Chat.rollup/1)
      |> Flow.run()
    end)
  end

  def threads() do
    if_enabled(fn ->
      ChatThread.unsummarized()
      |> ChatThread.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
      |> Flow.from_enumerable(stages: 20)
      |> Flow.map(&Chat.summarize/1)
      |> Flow.run()
    end)
  end

  def vector_expire() do
    with true <- VectorStore.enabled?() do
      VectorStore.expire(
        filters: [datatype: {:raw, :service_component}],
        expiry: Timex.now() |> Timex.shift(hours: -10)
      )
    end
  end

  defp batch_insight(event, chunk) do
    Stream.map(chunk, & {&1, Worker.generate(&1)})
    |> Stream.map(fn {res, t} -> {res, Worker.await(t)} end)
    |> Enum.each(fn
      {res, {:ok, insight}} ->
        handle_notify(event, {res, insight})
      _ -> :ok
    end)
  end

  def if_enabled(fun) do
    case Settings.cached() do
      %DeploymentSettings{ai: %{enabled: true}} ->
        fun.()
      _ -> :ok
    end
  end
end
