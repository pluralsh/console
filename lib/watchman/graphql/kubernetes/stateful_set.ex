defmodule Watchman.GraphQl.Kubernetes.StatefulSet do
  use Watchman.GraphQl.Schema.Base
  import Watchman.GraphQl.Kubernetes.Base
  alias Watchman.GraphQl.Resolvers.Kubernetes

  object :stateful_set do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:stateful_set_status)
    field :spec,     non_null(:stateful_set_spec)

    field :pods, list_of(:pod), resolve: fn
      %{metadata: metadata, spec: %{selector: selector}}, _, _ ->
        Kubernetes.list_pods(metadata, selector)
    end

    field :raw, non_null(:string), resolve: fn model, _, _ -> encode(model) end
  end

  object :stateful_set_status do
    field :current_replicas,     :integer
    field :replicas,             :integer
    field :ready_replicas,       :integer
    field :updated_replicas,     :integer
  end

  object :stateful_set_spec do
    field :replicas,     :integer
    field :service_name, :string
  end
end