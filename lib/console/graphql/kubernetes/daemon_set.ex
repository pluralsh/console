defmodule Console.GraphQl.Kubernetes.DaemonSet do
  use Console.GraphQl.Schema.Base
  import Console.GraphQl.Kubernetes.Base
  alias Console.GraphQl.Resolvers.Kubernetes

  object :daemon_set do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:daemon_set_status)
    field :spec,     non_null(:daemon_set_spec)

    field :pods, list_of(:pod), resolve: fn
      %{metadata: metadata, spec: %{selector: selector}}, _, _ ->
        Kubernetes.list_pods(metadata, selector)
    end

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
    field :events, list_of(:event), resolve: fn model, _, _ -> Kubernetes.list_events(model) end
  end

  object :daemon_set_status do
    field :current_number_scheduled, :integer
    field :desired_number_scheduled, :integer
    field :number_ready,             :integer
  end

  object :daemon_set_spec do
    field :strategy, :deployment_strategy
  end
end
