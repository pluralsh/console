defmodule Console.Application do
  use Application

  def start(_type, _args) do
    topologies = Application.get_env(:libcluster, :topologies)

    children = [
      %{
        id: :pg,
        start: {:pg, :start_link, []}
      },
      {Ecto.Migrator, [repos: [Console.LocalRepo], log_migrator_sql: true]},
      Console.PubSub.Broadcaster,
      Console.Repo,
      Console.LocalRepo,
      {Phoenix.PubSub, [name: Console.PubSub, adapter: Phoenix.PubSub.PG2]},
      Console.Cache,
      Console.ReplicatedCache,
      Console.TestCache,
      Console.LocalCache,
      ConsoleWeb.Endpoint,
      Console.Plural.Config,
      Console.Features,
      Console.Cron.Scheduler,
      {Registry, [keys: :unique, name: Console.Buffer.Base.registry()]},
      {Registry, [keys: :unique, name: Console.Deployments.Git.Agent.registry()]},
      {Registry, [keys: :unique, name: Console.Deployments.Pipelines.Supervisor.registry()]},
      {Registry, [keys: :unique, name: Console.Deployments.Stacks.Worker.registry()]},
      {Registry, [keys: :unique, name: Console.Deployments.Helm.Agent.registry()]},
      {Registry, [keys: :unique, name: Console.Deployments.Observer.Worker.registry()]},
      {Cluster.Supervisor, [topologies, [name: Console.ClusterSupervisor]]},
      Console.Deployments.Git.Supervisor,
      Console.Deployments.Stacks.Supervisor,
      Console.Deployments.Helm.Server,
      Console.Deployments.Pipelines.Supervisor,
      Console.Deployments.Helm.Supervisor,
      Console.Deployments.Observer.Supervisor,
      Console.Deployments.Git.Kick,
      Console.Deployments.Deprecations.Table,
      Console.Deployments.Compatibilities.Table,
      Console.Buffers.Supervisor,
      Console.Bootstrapper,
      {Absinthe.Subscription, ConsoleWeb.Endpoint},
      Console.Cached.Supervisor,
      Console.Watchers.Supervisor,
      Console.AI.GothManager,
      Console.PromEx,
      {OpenIDConnect.Worker, Application.get_env(:console, :oidc_providers)},
    ] ++ consumers() ++ [
      Piazza.GracefulShutdown
    ]

    opts = [strategy: :one_for_one, name: Console.Supervisor]
    Supervisor.start_link(children, opts)
  end

  def config_change(changed, _new, removed) do
    ConsoleWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp consumers(), do: Console.conf(:consumers) || []

  # defp deployer() do
  #   case {Console.conf(:build_id), Console.byok?()} do
  #     {build_id, _} when is_binary(build_id) ->
  #       [{Console.Runner.Harakiri, [Console.storage(), build_id]}]
  #     {_, false} -> [Console.Deployer]
  #     _ -> []
  #   end
  # end
end
