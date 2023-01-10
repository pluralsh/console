defmodule Console.GraphQl.Kubernetes.Namespace do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Kubernetes
  import Console.GraphQl.Kubernetes.Base

  object :namespace do
    field :status,   non_null(:namespace_status)
    field :spec,     non_null(:namespace_spec)
    field :metadata, non_null(:metadata)

    field :raw, non_null(:string), resolve: fn model, _, _ -> encode(model) end

    field :events, list_of(:event), resolve: fn
      model, _, _ -> Kubernetes.list_all_events(model)
    end
  end

  object :namespace_spec do
    field :finalizers, list_of(:string)
  end

  object :namespace_status do
    field :phase, :string
  end
end
