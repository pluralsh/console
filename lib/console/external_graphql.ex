defmodule Console.ExternalGraphQl do
  use Absinthe.Schema
  use Absinthe.Relay.Schema, :modern
  alias Console.GraphQl.Resolvers.{Deployments}

  defmodule Plug do
    # used to hack phoenix routing for `forward`
    defdelegate init(opts), to: Absinthe.Plug
    defdelegate call(conn, opts), to: Absinthe.Plug
  end

  import_types Absinthe.Type.Custom
  import_types Absinthe.Plug.Types
  import_types Console.GraphQl.CustomTypes
  import_types Console.GraphQl.Schema.Base
  import_types Console.GraphQl.Users
  import_types Console.GraphQl.Deployments

  @sources [Deployments]

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
    import_fields :public_service_queries
  end

  mutation do
    import_fields :public_cluster_mutations
    import_fields :public_service_mutations
  end
end
