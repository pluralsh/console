defmodule Watchman.Application do
  use Application

  @horde Watchman.Horde.Supervisor

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
      {Horde.Registry, name: Watchman.Registry, keys: :unique, members: :auto},
      {Horde.DynamicSupervisor,
       [
         name: @horde,
         strategy: :one_for_one,
         max_restarts: 100_000,
         shutdown: 3000,
         max_seconds: 1,
         members: :auto
       ]
      },
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
