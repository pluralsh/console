defmodule Console.Application do
  use Application

  def start(_type, _args) do
    topologies = Application.get_env(:libcluster, :topologies)
    ConsoleWeb.Plugs.MetricsExporter.setup()

    children = [
      %{
        id: :pg,
        start: {:pg, :start_link, []}
      },
      Console.PubSub.Broadcaster,
      Console.Repo,
      {Phoenix.PubSub, [name: Console.PubSub, adapter: Phoenix.PubSub.PG2]},
      ConsoleWeb.Endpoint,
      Console.Plural.Config,
      Console.Features,
      Console.Cron,
      {Registry, [keys: :unique, name: Console.Deployments.Git.Agent.registry()]},
      {Registry, [keys: :unique, name: Console.Deployments.Pipelines.Supervisor.registry()]},
      {Cluster.Supervisor, [topologies, [name: Console.ClusterSupervisor]]},
      Console.Deployments.Git.Supervisor,
      Console.Deployments.Pipelines.Supervisor,
      Console.Deployments.Git.Kick,
      Console.Deployments.Deprecations.Table,
      Console.Deployments.Compatibilities.Table,
      Console.Cache,
      Console.ReplicatedCache,
      Console.TestCache,
      Console.LocalCache,
      Console.Buffers.Supervisor,
      Console.Commands.Configuration,
      Console.Bootstrapper,
      {Absinthe.Subscription, ConsoleWeb.Endpoint},
      Console.Cached.Supervisor,
      Console.Watchers.Supervisor,
      {OpenIDConnect.Worker, Application.get_env(:console, :oidc_providers)},
    ] ++ consumers() ++ [
      Piazza.GracefulShutdown
    ] ++ deployer()

    opts = [strategy: :one_for_one, name: Console.Supervisor]
    Supervisor.start_link(children, opts)
  end

  def config_change(changed, _new, removed) do
    ConsoleWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp consumers(), do: Console.conf(:consumers) || []

  defp deployer() do
    case {Console.conf(:build_id), Console.byok?()} do
      {build_id, _} when is_binary(build_id) ->
        [{Console.Runner.Harakiri, [Console.storage(), build_id]}]
      {_, false} -> [Console.Deployer]
      _ -> []
    end
  end
end
