defmodule Watchman.Application do
  use Application

  @horde Watchman.Horde.Supervisor

  def start(_type, _args) do
    topologies = Application.get_env(:libcluster, :topologies)

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
      Watchman.Grafana.Token,
      {Absinthe.Subscription, [WatchmanWeb.Endpoint]},
      deployer_bootstrap()
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

  defp deployer_bootstrap() do
    %{
      id: Watchman.DeployerBootstrap,
      restart: :transient,
      start: {Task, :start_link, [&start_deployer/0]}
    }
  end

  defp start_deployer() do
    # Horde.DynamicSupervisor.wait_for_quorum(@horde, 30_000)
    :timer.sleep(4_000 + :rand.uniform(2_000))
    Horde.DynamicSupervisor.start_child(@horde, {Watchman.Deployer, determine_storage()})
  end

  # only support git for now
  defp determine_storage(), do: Watchman.Storage.Git

  defp consumers(), do: Watchman.conf(:consumers) || []
end
