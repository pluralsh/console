defmodule Console.Deployments.Cron do
  use Console.Services.Base
  alias Console.Deployments.{Services, Clusters, Global}
  alias Console.Schema.{Cluster, Service, GlobalService}

  require Logger

  def prune_services() do
    Logger.info "attempting to prune dangling deleted services"
    Service.deleted()
    |> Repo.all()
    |> Enum.each(fn svc ->
      Logger.info "pruning service #{svc.id}"
      case Repo.preload(svc, [:components]) do
        %Service{components: []} -> Services.hard_delete(svc)
        _ -> Logger.info "ignoring service #{svc.id}, not drained"
      end
    end)
  end

  def prune_clusters() do
    Logger.info "attempting to prune dangling deleted services"
    Cluster.deleted()
    |> Repo.all()
    |> Enum.each(fn cluster ->
      Logger.info "pruning cluster #{cluster.id}"
      case Clusters.draining?(cluster) do
        true -> Logger.info "ignoring cluster #{cluster.id}, not drained"
        false -> Clusters.drained(cluster)
      end
    end)
  end

  def prune_revisions() do
    Logger.info "pruning stale revisions for all services"

    Repo.all(Service)
    |> Enum.each(fn svc ->
      Logger.info "pruning revisions for #{svc.id}"
      Services.prune_revisions(svc)
    end)
  end

  def backfill_deprecations() do
    Logger.info "backfilling missing deprecations for all services"

    Repo.all(Service)
    |> Enum.each(fn svc ->
      Logger.info "checking deprecations for #{svc.id}"
      Services.add_deprecations(svc)
    end)
  end

  def backfill_global_services() do
    Logger.info "backfilling global services into all clusters"

    Repo.all(GlobalService)
    |> Enum.each(fn global ->
      Logger.info "syncing global service #{global.id}"
      Global.sync_clusters(global)
    end)
  end
end
