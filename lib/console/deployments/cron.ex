defmodule Console.Deployments.Cron do
  use Console.Services.Base
  alias Console.Deployments.{Services, Clusters, Global}
  alias Console.Services.Users
  alias Console.Schema.{Cluster, Service, ServiceComponent, GlobalService, PipelineStage, PipelinePromotion}
  alias Console.Deployments.Pipelines.Discovery

  require Logger

  def prune_services() do
    Logger.info "attempting to prune dangling deleted services"
    Service.deleted()
    |> Service.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn %{namespace: ns} = svc ->
      Logger.info "pruning service #{svc.id}"
      case Repo.preload(svc, [:components]) do
        %Service{components: []} -> Services.hard_delete(svc)
        %Service{components: [%ServiceComponent{kind: "Namespace", name: ^ns}]} -> Services.hard_delete(svc)
        _ -> Logger.info "ignoring service #{svc.id}, not drained"
      end
    end)
    |> Stream.run()
  end

  def prune_clusters() do
    Logger.info "attempting to prune dangling deleted services"
    Cluster.deleted()
    |> Cluster.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn cluster ->
      Logger.info "pruning cluster #{cluster.id}"
      case Clusters.draining?(cluster) do
        true -> Logger.info "ignoring cluster #{cluster.id}, not drained"
        false -> Clusters.drained(cluster)
      end
    end)
    |> Stream.run()
  end

  def cache_warm() do
    Cluster.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn cluster ->
      Logger.info "warming node caches for cluster"
      Clusters.warm(:nodes, cluster)
      Clusters.warm(:node_metrics, cluster)
    end)
    |> Stream.run()
  end

  def install_clusters() do
    Logger.info "attempting to install operator on dangling clusters"
    Cluster.uninstalled()
    |> Cluster.stream()
    |> Cluster.preloaded()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn cluster ->
      Logger.info "installing operator on #{cluster.id}"
      Clusters.install(cluster)
    end)
    |> Stream.run()
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
    |> Stream.each(fn svc ->
      Logger.info "pruning revisions for #{svc.id}"
      Services.prune_revisions(svc)
    end)
    |> Stream.run()
  end

  def backfill_deprecations() do
    Logger.info "backfilling missing deprecations for all services"

    Service.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn svc ->
      Logger.info "checking deprecations for #{svc.id}"
      Services.add_deprecations(svc)
    end)
    |> Stream.run()
  end

  def backfill_global_services() do
    Logger.info "backfilling global services into all clusters"

    GlobalService.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn global ->
      Logger.info "syncing global service #{global.id}"
      Global.sync_clusters(global)
    end)
    |> Stream.run()
  end

  def rotate_deploy_tokens() do
    Clusters.purge_deploy_tokens()
    Logger.info "rotating cluster deploy tokens"
    Cluster.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn cluster ->
      Logger.info "rotating token for #{cluster.id}"
      Clusters.rotate_deploy_token(cluster)
    end)
    |> Stream.run()
  end

  def scan_pipeline_stages() do
    PipelineStage.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn stage ->
      Logger.info "attempting to promote stage #{stage.id} (#{stage.name})"
      Discovery.stage(stage)
    end)
    |> Stream.run()
  end

  def scan_pending_promotions() do
    PipelinePromotion.pending()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn promo ->
      Logger.info "attempting to apply promotion #{promo.id}"
      Discovery.promotion(promo)
    end)
    |> Stream.run()
  end
end
