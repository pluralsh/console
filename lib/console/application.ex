defmodule Console.Application do
  use Application

  def start(_type, _args) do
    topologies = Application.get_env(:libcluster, :topologies)
    ConsoleWeb.Plugs.MetricsExporter.setup()

    children = [
      Console.PubSub.Broadcaster,
      Console.Repo,
      ConsoleWeb.Endpoint,
      Console.Commands.Configuration,
      Console.Plural.Config,
      Console.Cron,
      Console.Cache,
      Console.ReplicatedCache,
      {Cluster.Supervisor, [topologies, [name: Console.ClusterSupervisor]]},
      Console.Bootstrapper,
      Console.Deployer,
      {Absinthe.Subscription, [ConsoleWeb.Endpoint]},
    ] ++ consumers() ++ [
      Piazza.GracefulShutdown
    ] ++ socket()
      ++ Console.conf(:watchers)

    opts = [strategy: :one_for_one, name: Console.Supervisor]
    Supervisor.start_link(children, opts)
  end

  def config_change(changed, _new, removed) do
    ConsoleWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp consumers(), do: Console.conf(:consumers) || []

  defp socket() do
    case Console.conf(:initialize) do
      true -> [Console.Watchers.Plural.worker()]
      _ -> []
    end
  end
end
