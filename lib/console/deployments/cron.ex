defmodule Console.Deployments.Cron do
  use Console.Services.Base
  alias Console.Deployments.{Services, Clusters}
  alias Console.Schema.{Cluster, Service}

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
end
