defmodule Console.Application do
  use Application

  def start(_type, _args) do
    topologies = Application.get_env(:libcluster, :topologies)
    ConsoleWeb.Plugs.MetricsExporter.setup()

    children = [
      Console.PubSub.Broadcaster,
      Console.Repo,
      {Phoenix.PubSub, [name: Console.PubSub, adapter: Phoenix.PubSub.PG2]},
      ConsoleWeb.Endpoint,
      Console.Clustering.Connect,
      Console.Plural.Config,
      Console.Features,
      Console.Cron,
      Console.Cache,
      Console.ReplicatedCache,
      Console.TestCache,
      Console.Buffers.Supervisor,
      {Registry, [keys: :unique, name: Console.Deployments.Git.Agent.registry()]},
      {Cluster.Supervisor, [topologies, [name: Console.ClusterSupervisor]]},
      Console.Bootstrapper,
      {Absinthe.Subscription, ConsoleWeb.Endpoint},
      Console.Cached.Namespace,
      Console.Cached.Pod,
      Console.Cached.VPN,
      Console.Cached.Node,
      Console.Watchers.Supervisor,
      Console.Deployments.Git.Supervisor,
      Console.Deployments.Git.Kick,
      Console.Deployments.Deprecations.Table,
      {OpenIDConnect.Worker, Application.get_env(:console, :oidc_providers)},
    ] ++ consumers() ++ [
      Piazza.GracefulShutdown
    ] ++ socket()
      ++ deployer()

    opts = [strategy: :one_for_one, name: Console.Supervisor]
    Supervisor.start_link(children, opts)
  end

  def config_change(changed, _new, removed) do
    ConsoleWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp consumers(), do: Console.conf(:consumers) || []

  defp deployer() do
    case Console.conf(:build_id) do
      build_id when is_binary(build_id) ->
        [{Console.Runner.Harakiri, [Console.storage(), build_id]}]
      _ -> [Console.Deployer]
    end
  end

  defp socket() do
    case Console.conf(:initialize) do
      true -> [Console.Watchers.Plural.worker()]
      _ -> []
    end
  end
end
