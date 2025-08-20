defmodule Console.Deployments.Cron do
  use Console.Services.Base
  import Console, only: [clamp: 1]
  alias Console.Deployments.{Services, Clusters, Global, Stacks, Git}
  alias Console.Services.Users
  alias Console.Schema.{
    Cluster,
    Service,
    ServiceComponent,
    PipelineStage,
    PipelinePromotion,
    AgentMigration,
    ManagedNamespace,
    StackRun,
    StackCron,
    PullRequest,
    RunLog,
    AppNotification,
    Observer,
    Alert,
    ClusterAuditLog,
    PolicyConstraint,
    VulnerabilityReport,
    ServiceTemplate
  }
  alias Console.Deployments.Pipelines.Discovery

  require Logger

  def prune_services() do
    Logger.info "attempting to prune dangling deleted services"
    Service.deleted()
    |> Service.stream()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn %{namespace: ns} = svc ->
      Logger.info "pruning service #{svc.id}"
      case Repo.preload(svc, [:components]) do
        %Service{components: []} -> Services.hard_delete(svc)
        %Service{components: [%ServiceComponent{kind: "Namespace", name: ^ns}]} -> Services.hard_delete(svc)
        _ -> Logger.info "ignoring service #{svc.id}, not drained"
      end
    end, max_concurrency: clamp(Services.count_all()))
    |> Stream.run()
  end

  def prune_clusters() do
    Logger.info "attempting to prune dangling deleted clusters"
    Cluster.deleted()
    |> Cluster.stream()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn cluster ->
      Logger.info "pruning cluster #{cluster.id}"
      case Clusters.draining?(cluster) do
        true -> Logger.info "ignoring cluster #{cluster.id}, not drained"
        false -> Clusters.drained(cluster)
      end
    end, max_concurrency: clamp(Clusters.count()))
    |> Stream.run()
  end

  def prune_alerts() do
    Logger.info "pruning all expired alerts"
    Alert.expired()
    |> Repo.delete_all(timeout: 300_000)
  end

  def cache_warm(), do: Git.warm_helm_cache()

  def install_clusters() do
    Logger.info "attempting to install operator on dangling clusters"
    if !Console.cloud?() do
      Cluster.uninstalled()
      |> Cluster.stream()
      |> Cluster.preloaded()
      |> Repo.stream(method: :keyset)
      |> Stream.each(fn cluster ->
        Logger.info "installing operator on #{cluster.id}, name=#{cluster.name}, handle=#{cluster.handle}"
        Clusters.install(cluster)
      end)
      |> Stream.run()
    else
      Logger.info "not installing on cloud consoles"
    end
  end

  def migrate_kas() do
    Logger.info "trying to migrate kas url for all agents"
    bot = %{Users.get_bot!("console") | roles: %{admin: true}}
    expected = Clusters.kas_url()
    Service.agent()
    |> Service.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn svc ->
      Logger.info "migrating kas to current value"
      case Services.configuration(svc) do
        {:ok, %{"kasAddress" => ^expected}} -> Logger.info "ignoring #{svc.id} as it has correct address"
        _ -> Services.merge_service([%{name: "kasAddress", value: expected}], svc.id, bot)
      end
    end)
    |> Stream.run()
  end

  def prune_revisions() do
    Logger.info "pruning stale revisions for all services"

    Service.stream()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn svc ->
      Logger.info "pruning revisions for #{svc.id}"
      Services.prune_revisions(svc)
    end, max_concurrency: clamp(Services.count_all()))
    |> Stream.run()
  end

  def update_upgrade_plans() do
    Cluster.installed()
    |> Cluster.stream()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn cluster ->
      Logger.info "compiling upgrade plan for #{cluster.handle}"
      Clusters.update_upgrade_plan(cluster)
    end, max_concurrency: clamp(Clusters.count()))
    |> Stream.run()
  end

  def backfill_deprecations() do
    Logger.info "backfilling missing deprecations for all services"

    Service.stream()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn svc ->
      Logger.info "checking deprecations for #{svc.id}"
      Services.add_deprecations(svc)
    end, max_concurrency: clamp(Services.count_all()))
    |> Stream.run()
  end

  def backfill_managed_namespaces() do
    Logger.info "backfilling managed namespaces across clusters"

    ManagedNamespace.stream()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn mns ->
      Logger.info "syncing managed namespace #{mns.id}"
      Global.reconcile_namespace(mns)
    end, max_concurrency: 20)
    |> Stream.run()
  end

  def drain_managed_namespaces() do
    Logger.info "draining managed namespaces across clusters"

    ManagedNamespace.deleted()
    |> ManagedNamespace.stream()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn mns ->
      Logger.info "draining managed namespace #{mns.id}"
      Global.drain_managed_namespace(mns)
    end, max_concurrency: 10)
    |> Stream.run()
  end

  def rotate_deploy_tokens() do
    Clusters.purge_deploy_tokens()
    Logger.info "rotating cluster deploy tokens"
    Cluster.stream()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn cluster ->
      Logger.info "rotating token for #{cluster.id}"
      Clusters.rotate_deploy_token(cluster)
    end, max_concurrency: clamp(Clusters.count()))
    |> Stream.run()
  end

  def migrate_agents() do
    AgentMigration.incomplete()
    |> AgentMigration.ordered()
    |> Repo.all()
    |> Stream.each(&Clusters.apply_migration/1)
    |> Stream.run()
  end

  def prune_migrations() do
    AgentMigration.expired()
    |> Repo.delete_all(timeout: 300_000)
  end

  def scan_pipeline_stages() do
    PipelineStage.stream()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn stage ->
      Logger.info "attempting to promote stage #{stage.id} (#{stage.name})"
      Discovery.stage(stage)
    end, max_concurrency: 10)
    |> Stream.run()
  end

  def scan_pending_promotions() do
    PipelinePromotion.pending()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn promo ->
      Logger.info "attempting to apply promotion #{promo.id}"
      Discovery.promotion(promo)
    end, max_concurrency: 10)
    |> Stream.run()
  end

  def scan_pending_contexts() do
    PipelineStage.pending_context()
    |> PipelineStage.stream()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn stage ->
      Logger.info "attempt to apply context for a stage"
      Discovery.context(stage)
    end, max_concurrency: 10)
    |> Stream.run()
  end

  def prune_logs() do
    Logger.info "deleting old run logs"
    RunLog.expired()
    |> Repo.delete_all(timeout: 300_000)
  end

  def place_run_workers() do
    StackRun.running()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn run ->
      Logger.info "ensuring run worker #{run.id} is placed"
      Stacks.Discovery.runner(run)
    end)
    |> Stream.run()
  end

  def spawn_stack_crons() do
    StackCron.executable()
    |> StackCron.ordered()
    |> Repo.all()
    |> Console.throttle()
    |> Stream.each(fn cron ->
      Logger.info "spawning stack cron run for #{cron.stack_id}"
      Stacks.spawn_cron(cron)
    end)
    |> Stream.run()
  end

  def prune_notifications() do
    AppNotification.expired()
    |> Repo.delete_all(timeout: 300_000)
  end

  def prune_cluster_audit_logs() do
    ClusterAuditLog.expired()
    |> Repo.delete_all(timeout: 300_000)
  end

  def run_observers() do
    Observer.runnable()
    |> Observer.ordered(asc: :id)
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(&Console.Deployments.Observer.Discovery.runner/1, max_concurrency: 50)
    |> Stream.run()
  end

  def prune_policy() do
    PolicyConstraint.expired()
    |> Repo.delete_all(timeout: 300_000)
  end

  def prune_vuln_reports() do
    VulnerabilityReport.expired()
    |> Repo.delete_all(timeout: 300_000)
  end

  def prune_dangling_templates() do
    ServiceTemplate.dangling()
    |> ServiceTemplate.ordered(asc: :id)
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn template ->
      Logger.info "pruning dangling template #{template.id}"
      Repo.delete(template, timeout: 10_000)
    end, max_concurrency: 10)
    |> Stream.run()
  end

  def add_ignore_crds(search) do
    Service.search(search)
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn svc ->
      Service.changeset(svc, %{helm: %{ignore_crds: true}})
      |> Repo.update()
    end)
    |> Stream.run()
  end

  def pr_governance() do
    PullRequest.stream()
    |> PullRequest.pending_governance()
    |> Repo.stream(method: :keyset)
    |> Task.async_stream(fn pr ->
      Logger.info "attempting to apply governance for #{pr.id}"
      Git.confirm_pull_request(pr)
    end, max_concurrency: 20)
    |> Stream.run()
  end
end
