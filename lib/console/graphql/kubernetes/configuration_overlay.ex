defmodule Console.GraphQl.Kubernetes.ConfigurationOverlay do
  use Console.GraphQl.Schema.Base

  object :configuration_overlay do
    field :metadata, non_null(:metadata)
    field :spec, non_null(:configuration_overlay_spec)
  end

  object :overlay_update do
    field :path, list_of(:string)
  end

  object :configuration_overlay_spec do
    field :name,          :string
    field :documentation, :string
    field :path,          list_of(:overlay_update)
    field :input_type,    :string
    field :input_values,  list_of(:string)
  end
end
