defmodule Console.GraphQl.Kubernetes.Deployment do
  use Console.GraphQl.Schema.Base
  import Console.GraphQl.Kubernetes.Base
  alias Console.GraphQl.Resolvers.Kubernetes

  object :deployment do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:deployment_status)
    field :spec,     non_null(:deployment_spec)

    field :pods, list_of(:pod), resolve: fn
      %{metadata: metadata, spec: %{selector: selector}}, _, _ ->
        Kubernetes.list_pods(metadata, selector)
    end

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
    field :events, list_of(:event), resolve: fn model, _, _ -> Kubernetes.list_events(model) end
  end

  object :deployment_status do
    field :available_replicas,   :integer
    field :replicas,             :integer
    field :ready_replicas,       :integer
    field :unavailable_replicas, :integer
  end

  object :deployment_spec do
    field :replicas, :integer
    field :strategy, :deployment_strategy
  end

  object :deployment_strategy do
    field :type,           :string
    field :rolling_update, :rolling_update
  end

  object :rolling_update do
    field :max_surge,       :integer
    field :max_unavailable, :integer
  end
end
