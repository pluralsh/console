defmodule Console.GraphQl do
  use Absinthe.Schema
  use Absinthe.Relay.Schema, :modern
  import Console.GraphQl.Helpers
  alias Console.Middleware.{SafeResolution, ErrorHandler}
  alias Console.GraphQl.Resolvers.{
    User,
    License,
    UserLoader,
    HelmRepositoryLoader,
    PipelineGateLoader,
    ClusterLoader,
    Deployments,
    AI
  }

  import_types Absinthe.Type.Custom
  import_types Absinthe.Plug.Types
  import_types Console.GraphQl.CustomTypes
  import_types Console.GraphQl.Schema.Base
  import_types Console.GraphQl.Configuration
  import_types Console.GraphQl.Users
  import_types Console.GraphQl.Kubernetes
  import_types Console.GraphQl.Observability
  import_types Console.GraphQl.Audit
  import_types Console.GraphQl.Plural
  import_types Console.GraphQl.AI
  import_types Console.GraphQl.Deployments
  import_types Console.GraphQl.OIDC

  @sources [
    AI,
    User,
    License,
    Deployments,
    UserLoader,
    HelmRepositoryLoader,
    PipelineGateLoader,
    ClusterLoader
  ]

  def context(ctx) do
    loader = make_dataloader(@sources, ctx)
    Map.put(ctx, :loader, loader)
  end

  defp make_dataloader(sources, ctx) do
    Enum.reduce(sources, Dataloader.new(), fn source, loader ->
      Dataloader.add_source(loader, source, source.data(ctx))
    end)
  end

  def plugins do
    [Absinthe.Middleware.Dataloader] ++ Absinthe.Plugin.defaults()
  end

  def middleware(middleware, _field, %{identifier: type}) when type in [:query, :mutation] do
    SafeResolution.apply(middleware) ++ [ErrorHandler]
  end
  def middleware(middleware, _field, _object), do: middleware

  query do
    import_fields :configuration_queries
    import_fields :user_queries
    import_fields :observability_queries
    import_fields :kubernetes_queries
    import_fields :audit_queries
    import_fields :plural_queries
    import_fields :deployment_queries
    import_fields :ai_queries
    import_fields :oidc_queries
  end

  mutation do
    import_fields :user_mutations
    import_fields :kubernetes_mutations
    import_fields :deployment_mutations
    import_fields :ai_mutations
    import_fields :oidc_mutations
  end

  subscription do
    import_fields :kubernetes_subscriptions
    import_fields :user_subscriptions
    import_fields :stack_subscriptions
    import_fields :ai_subscriptions
  end

  def safe_resolver(fun) do
    fn args, ctx ->
      try do
        case fun.(args, ctx) do
          {:ok, res} -> {:ok, res}
          {:error, {:http_error, _, %{"message" => msg}}} -> {:error, msg}
          {:error, %Ecto.Changeset{} = cs} -> {:error, resolve_changeset(cs)}
          error -> error
        end
      rescue
        error -> {:error, Exception.message(error)}
      end
    end
  end
end
