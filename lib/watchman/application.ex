defmodule Watchman.Application do
  use Application

  def start(_type, _args) do
    topologies = Application.get_env(:libcluster, :topologies)
    WatchmanWeb.Plugs.MetricsExporter.setup()

    children = [
      Watchman.PubSub.Broadcaster,
      Watchman.Repo,
      WatchmanWeb.Endpoint,
      Watchman.Commands.Configuration,
      Watchman.Plural.Config,
      Watchman.Cron,
      Watchman.Cache,
      Watchman.ReplicatedCache,
      {Cluster.Supervisor, [topologies, [name: Watchman.ClusterSupervisor]]},
      Watchman.Bootstrapper,
      Watchman.Deployer,
      {Absinthe.Subscription, [WatchmanWeb.Endpoint]},
    ] ++ consumers() ++ [
      Piazza.GracefulShutdown
    ] ++ socket()
      ++ Watchman.conf(:watchers)

    opts = [strategy: :one_for_one, name: Watchman.Supervisor]
    Supervisor.start_link(children, opts)
  end

  def config_change(changed, _new, removed) do
    WatchmanWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp consumers(), do: Watchman.conf(:consumers) || []

  defp socket() do
    case Watchman.conf(:initialize) do
      true -> [Watchman.Watchers.Plural.worker()]
      _ -> []
    end
  end
end
