defmodule Console.Application do
  use Application
  alias Console.Services.OAuth

  def start(_type, _args) do
    topologies = Application.get_env(:libcluster, :topologies)

    children = [
      %{
        id: :pg,
        start: {:pg, :start_link, []}
      },
      Console.PubSub.Broadcaster,
      Console.Repo,
      {Phoenix.PubSub, [name: Console.PubSub, adapter: Phoenix.PubSub.PG2]},
      Console.Cache,
      Console.ReplicatedCache,
      Console.MultilevelCache,
      Console.TestCache,
      Console.LocalCache,
      ConsoleWeb.Endpoint,
      Console.Plural.Config,
      Console.Features,
      Console.Cron.Scheduler,
      Console.Buffers.ClusterAudit,
      Console.Deployments.Local.Server,
      Console.Prom.Meter,
      {Registry, [keys: :unique, name: Console.Buffer.Base.registry()]},
      {Registry, [keys: :unique, name: Console.Deployments.Git.Agent.registry()]},
      {Registry, [keys: :unique, name: Console.Deployments.Pipelines.Supervisor.registry()]},
      {Registry, [keys: :unique, name: Console.Deployments.Stacks.Worker.registry()]},
      {Registry, [keys: :unique, name: Console.Deployments.Helm.Agent.registry()]},
      {Registry, [keys: :unique, name: Console.Deployments.Observer.Worker.registry()]},
      {Registry, [keys: :unique, name: Console.AI.MCP.Agent.registry()]},
      {Registry, [keys: :unique, name: Console.AI.Agents]},
      {Cluster.Supervisor, [topologies, [name: Console.ClusterSupervisor]]},
      Console.Deployments.Git.Supervisor,
      Console.Deployments.Stacks.Supervisor,
      Console.Deployments.Helm.Server,
      Console.Deployments.Pipelines.Supervisor,
      Console.Deployments.Helm.Supervisor,
      Console.Deployments.Observer.Supervisor,
      Console.AI.Agents.Supervisor,
      Console.AI.MCP.Supervisor,
      Console.Deployments.Git.Kick,
      Console.Deployments.Deprecations.Table,
      Console.Deployments.Compatibilities.Table,
      Console.Deployments.Compatibilities.CloudAddOns,
      Console.Buffers.Supervisor,
      Console.Bootstrapper,
      {Absinthe.Subscription, ConsoleWeb.Endpoint},
      Console.Cached.Supervisor,
      Console.Watchers.Supervisor,
      Console.AI.GothManager,
      Console.PromEx,
      Console.AI.Graph.Indexer.Supervisor,
    ] ++ consumers()
      ++ oidc_providers()
      ++ [
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

  defp oidc_providers() do
    case OAuth.issuer() do
      iss when is_binary(iss) ->
        [
          {
            Oidcc.ProviderConfiguration.Worker,
            %{
              issuer: iss,
              name: OAuth.name(),
              provider_configuration_opts: %{quirks: %{allow_issuer_mismatch: true}},
              backoff_type: :exponential
            }
          }
        ]
      _ -> []
    end
  end
end
