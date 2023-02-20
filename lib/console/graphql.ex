defmodule Console.GraphQl do
  use Absinthe.Schema
  use Absinthe.Relay.Schema, :modern
  import Console.GraphQl.Helpers
  alias Console.GraphQl.Resolvers.{Build, User, Kubecost, License, UserLoader}

  import_types Absinthe.Type.Custom
  import_types Absinthe.Plug.Types
  import_types Console.GraphQl.CustomTypes
  import_types Console.GraphQl.Schema.Base
  import_types Console.GraphQl.Build
  import_types Console.GraphQl.Configuration
  import_types Console.GraphQl.Users
  import_types Console.GraphQl.Kubernetes
  import_types Console.GraphQl.Observability
  import_types Console.GraphQl.Audit
  import_types Console.GraphQl.Plural
  import_types Console.GraphQl.Policies
  import_types Console.GraphQl.Runbooks
  import_types Console.GraphQl.Webhooks

  @sources [
    Build,
    User,
    Kubecost,
    License,
    UserLoader
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

  query do
    import_fields :configuration_queries
    import_fields :build_queries
    import_fields :user_queries
    import_fields :observability_queries
    import_fields :kubernetes_queries
    import_fields :audit_queries
    import_fields :plural_queries
    import_fields :policy_queries
    import_fields :runbook_queries
    import_fields :webhook_queries
  end

  mutation do
    import_fields :build_mutations
    import_fields :user_mutations
    import_fields :kubernetes_mutations
    import_fields :plural_mutations
    import_fields :policy_mutations
    import_fields :runbook_mutations
    import_fields :webhook_mutations
  end

  subscription do
    import_fields :kubernetes_subscriptions
    import_fields :build_subscriptions
    import_fields :user_subscriptions
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
