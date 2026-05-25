defmodule Console.AI.Cron do
  import Console.Services.Base, only: [handle_notify: 2]
  alias Console.{Repo, PubSub}
  alias Console.AI.{Worker, Chat, VectorStore, Workbench}
  alias Console.Deployments.{Settings, Sentinels}
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
    SentinelRun,
    PrAutomation,
    Catalog,
    WorkbenchJob
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
    Logger.info "pruning expired agent runs"
    AgentRun.expired()
    |> AgentRun.ordered(desc: :id)
    |> Repo.stream(method: :keyset)
    |> Console.throttle(count: 100, pause: 1)
    |> Stream.chunk_every(20)
    |> Task.async_stream(fn chunk ->
      Logger.info "pruning #{length(chunk)} agent runs"
      Enum.map(chunk, & &1.id)
      |> AgentRun.for_ids()
      |> Repo.delete_all(timeout: 300_000)
    end, max_concurrency: 10)
    |> Stream.run()
  end

  def trim_sentinel_runs() do
    SentinelRun.expired()
    |> Repo.delete_all()
  end

  def autokill_sentinel_runs() do
    Sentinels.autokill()
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
        filters: [datatype: {:raw, [:service_component, :cluster]}],
        expiry: Timex.now() |> Timex.shift(hours: -10)
      )
    end
  end

  def vector_index() do
    Catalog
    |> Catalog.ordered(asc: :id)
    |> Repo.stream(method: :keyset)
    |> Stream.concat(
      PrAutomation
      |> PrAutomation.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
    )
    |> Stream.map(&Console.AI.PubSub.Vector.Bulk.insert/1)
    |> Stream.run()
  end

  def vectorize_stacks() do
    with true <- VectorStore.enabled?() do
      Logger.info "re-vectorizing all stacks with state"
      Stack.for_status(:successful)
      |> Stack.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
      |> Console.throttle()
      |> Stream.each(&Console.AI.PubSub.Vector.Bulk.insert/1)
      |> Stream.run()
    end
  end

  def vectorize_workbench_jobs() do
    with true <- VectorStore.enabled?() do
      Logger.info "re-vectorizing all workbench jobs"
      WorkbenchJob.resolved()
      |> WorkbenchJob.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
      |> Console.throttle()
      |> Stream.map(&Console.AI.PubSub.Vector.Bulk.insert/1)
      |> Stream.run()
    end
  end

  @doc """
  Backfills vector indexes for all terminal workbench jobs.

  Unlike `vectorize_workbench_jobs/0`, which only re-indexes resolved jobs (those
  with a merged pull request), this walks every successful, failed, or cancelled
  job and emits `WorkbenchJobUpdated` events through the vector pubsub pipeline.
  Useful for repairing missing indexes or refreshing stored metadata such as
  `workbench_id`.
  """
  def backfill_workbench_job_vectors() do
    with true <- VectorStore.enabled?() do
      Logger.info "backfilling workbench job vectors"

      WorkbenchJob.indexable()
      |> WorkbenchJob.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
      |> Console.throttle()
      |> Stream.map(&Console.AI.PubSub.Vector.Bulk.insert/1)
      |> Stream.run()
    end
  end

  def workbench_job_knowledge_backfill() do
    WorkbenchJob.requires_backfill()
    |> WorkbenchJob.resolved()
    |> WorkbenchJob.preloaded([:result, :pull_requests, workbench: [:repository, :workbench_skills]])
    |> WorkbenchJob.ordered(asc: :id)
    |> Repo.stream(method: :keyset)
    |> Console.throttle()
    |> Flow.from_enumerable(stages: 5)
    |> Flow.map(&Workbench.Knowledge.Backfill.skills/1)
    |> Flow.run()
  end

  def workbench_job_eval() do
    WorkbenchJob.missing_evals()
    |> WorkbenchJob.ordered(asc: :id)
    |> WorkbenchJob.preloaded([:activities, workbench: :eval])
    |> Repo.stream(method: :keyset)
    |> Console.throttle()
    |> Flow.from_enumerable(stages: 5)
    |> Flow.map(&Workbench.Eval.evaluate/1)
    |> Flow.run()
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
