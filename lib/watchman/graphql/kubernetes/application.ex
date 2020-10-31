defmodule Watchman.GraphQl.Kubernetes.Application do
  use Watchman.GraphQl.Schema.Base
  alias Watchman.GraphQl.Resolvers.Forge

  object :application do
    field :name,   non_null(:string), resolve: fn %{metadata: %{name: name}}, _, _ -> {:ok, name} end
    field :spec,   non_null(:application_spec)
    field :status, non_null(:application_status)

    field :configuration, :string, resolve: &Forge.resolve_configuration/3
  end

  object :application_spec do
    field :descriptor, non_null(:application_descriptor)
    field :components, list_of(:component)
  end

  object :application_descriptor do
    field :type,        non_null(:string)
    field :version,     non_null(:string)
    field :description, non_null(:string)
    field :icons,       list_of(:string), resolve: fn %{icons: icons}, _, _ ->
      {:ok, Enum.map(icons, & &1.src)}
    end
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