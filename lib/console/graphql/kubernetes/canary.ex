defmodule Console.GraphQl.Kubernetes.Canary do
  use Console.GraphQl.Schema.Base
  import Console.GraphQl.Kubernetes.Base
  alias Console.GraphQl.Resolvers.Kubernetes

  object :canary do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:canary_status)
    field :spec,     non_null(:canary_spec)

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
    field :events, list_of(:event), resolve: fn model, _, _ -> Kubernetes.list_events(model) end
  end

  object :canary_status do
    field :conditions,           list_of(:status_condition)
    field :failed_checks,        :integer
    field :canary_weight,        :integer
    field :iterations,           :integer
    field :last_transition_time, :string
    field :phase,                :string
  end

  object :canary_spec do
    field :autoscaler_ref, :target_ref
    field :target_ref,     :target_ref
    field :analysis,       :canary_analysis
    field :provider,       :string
  end

  object :canary_analysis do
    field :interval,     :string
    field :step_weights, list_of(:integer)
    field :threshold,    :integer
  end

  object :target_ref do
    field :api_version, :string
    field :kind,        :string
    field :name,        :string
  end
end
