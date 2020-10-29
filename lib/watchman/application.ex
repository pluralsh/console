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
      Watchman.Forge.Config,
      Watchman.Cron,
      {Cluster.Supervisor, [topologies, [name: Watchman.ClusterSupervisor]]},
      Watchman.Watchers,
      Watchman.Bootstrapper,
      Watchman.Deployer,
      Watchman.Grafana.Token,
      {Absinthe.Subscription, [WatchmanWeb.Endpoint]},
    ] ++ consumers() ++ [
      Piazza.GracefulShutdown
    ]

    opts = [strategy: :one_for_one, name: Watchman.Supervisor]
    Supervisor.start_link(children, opts)
  end

  def config_change(changed, _new, removed) do
    WatchmanWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp consumers(), do: Watchman.conf(:consumers) || []
end
