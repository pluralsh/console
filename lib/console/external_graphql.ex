defmodule Console.ExternalGraphQl do
  use Absinthe.Schema
  use Absinthe.Relay.Schema, :modern
  alias Console.Middleware.{SafeResolution, ErrorHandler}
  alias Console.GraphQl.Resolvers.{Deployments}

  defmodule Plug do
    # used to hack phoenix routing for `forward`
    defdelegate init(opts), to: Absinthe.Plug
    defdelegate call(conn, opts), to: Absinthe.Plug
  end

  object :metadata do
    field :labels,             list_of(:label_pair), resolve: fn %{labels: labels}, _, _ -> {:ok, make_labels(labels)} end
    field :annotations,        list_of(:label_pair), resolve: fn %{annotations: labels}, _, _ -> {:ok, make_labels(labels)} end
    field :name,               non_null(:string)
    field :namespace,          :string
    field :creation_timestamp, :string
  end

  object :label_pair do
    field :name,  :string
    field :value, :string
  end


  object :resource_spec do
    field :cpu,    :string, resolve: fn
      %{cpu: cpu}, _, _ -> {:ok, cpu}
      resources, _, _ -> {:ok, resources["cpu"]}
    end
    field :memory, :string, resolve: fn
      %{memory: memory}, _, _ -> {:ok, memory}
      resources, _, _ -> {:ok, resources["memory"]}
    end
  end

  import_types Absinthe.Type.Custom
  import_types Absinthe.Plug.Types
  import_types Console.GraphQl.CustomTypes
  import_types Console.GraphQl.Schema.Base
  import_types Console.GraphQl.Users
  import_types Console.GraphQl.Deployments
  import_types Console.GraphQl.Kubernetes.Pod
  import_types Console.GraphQl.Kubernetes.Node
  import_types Console.GraphQl.Kubernetes.Event

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

  def middleware(middleware, _field, %{identifier: type}) when type in [:query, :mutation] do
    SafeResolution.apply(middleware) ++ [ErrorHandler]
  end
  def middleware(middleware, _field, _object), do: middleware

  query do
    import_fields :public_service_queries
  end

  mutation do
    import_fields :public_cluster_mutations
    import_fields :public_service_mutations
  end


  defp make_labels(nil), do: []
  defp make_labels(map), do: Enum.map(map, fn {key, value} -> %{name: key, value: value} end)
end
