defmodule Console.GraphQl.Kubernetes.Application do
  use Console.GraphQl.Schema.Base
  alias Console.Middleware.{Rbac}
  alias Console.GraphQl.Resolvers.{Plural, Kubecost, License}

  object :application do
    field :name,   non_null(:string), resolve: fn %{metadata: %{name: name}}, _, _ -> {:ok, name} end
    field :spec,   non_null(:application_spec)
    field :status, non_null(:application_status)

    field :cost, :cost_analysis, resolve: fn
      %{metadata: %{namespace: name}}, _, %{context: %{loader: loader}} ->
        loader
        |> Dataloader.load(Kubecost, :namespace, name)
        |> on_load(fn loader ->
          {:ok, Dataloader.get(loader, Kubecost, :namespace, name)}
        end)
    end

    field :license, :license, resolve: fn
      %{metadata: %{name: name}}, _, %{context: %{loader: loader}} ->
        loader
        |> Dataloader.load(License, :name, name)
        |> on_load(fn loader ->
          {:ok, Dataloader.get(loader, License, :name, name)}
        end)
    end

    field :configuration, :configuration do
      middleware Rbac, perm: :configure, field: [:metadata, :name]
      resolve &Plural.resolve_configuration/3
    end
  end

  object :cost_analysis do
    field :minutes,                :float
    field :cpu_cost,               :float
    field :cpu_efficiency,         :float
    field :efficiency,             :float
    field :gpu_cost,               :float
    field :network_cost,           :float
    field :pv_cost,                :float
    field :ram_cost,               :float
    field :ram_efficiency,         :float
    field :total_cost,             :float
    field :shared_cost,            :float
  end

  object :application_spec do
    field :descriptor, non_null(:application_descriptor)
    field :components, list_of(:component)
    field :info, list_of(:application_info_item)
  end

  object :application_link do
    field :url,         :string
    field :description, :string
  end

  object :application_info_item do
    field :type,  :string
    field :name,  :string
    field :value, :string
  end

  object :application_descriptor do
    field :type,        non_null(:string)
    field :version,     non_null(:string)
    field :description, :string
    field :icons,       list_of(:string), resolve: fn
      %{icons: [_ | _] = icons}, _, _ -> {:ok, Enum.map(icons, & &1.src)}
      _, _, _ -> {:ok, []}
    end
    field :links, list_of(:application_link)
  end

  object :component do
    field :group, non_null(:string)
    field :kind,  non_null(:string)
  end

  object :application_status do
    field :components,       list_of(:status_component)
    field :conditions,       list_of(:status_condition)
    field :components_ready, non_null(:string)
  end

  object :status_component do
    field :group,  :string
    field :kind,   non_null(:string)
    field :name,   non_null(:string)
    field :status, non_null(:string)
  end

  object :status_condition do
    field :message, non_null(:string)
    field :reason,  non_null(:string)
    field :status,  non_null(:string)
    field :type,    non_null(:string)
  end
end
