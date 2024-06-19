defmodule Console.GraphQl.Kubernetes.Rollout do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Kubernetes
  import Console.GraphQl.Kubernetes.Base

  object :argo_rollout do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:argo_rollout_status)
    field :spec,     non_null(:argo_rollout_spec)

    field :pods, list_of(:pod), resolve: fn
      %{metadata: metadata, status: %{selector: selector}}, _, _ ->
        Kubernetes.list_pods(metadata, selector)
      _, _, _ -> {:ok, []}
    end

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
    field :events, list_of(:event), resolve: fn model, _, _ -> Kubernetes.list_events(model) end
  end

  object :argo_rollout_spec do
    field :replicas, :integer
    field :strategy, :argo_rollout_strategy
  end

  object :argo_rollout_strategy do
    field :blue_green, :argo_blue_green_strategy
    field :canary,     :argo_canary_strategy
  end

  object :argo_blue_green_strategy do
    field :active_service,         :string
    field :auto_promotion_enabled, :boolean
    field :auto_promotion_seconds, :integer
  end

  object :argo_canary_strategy do
    field :steps, list_of(:argo_strategy_step)
  end

  object :argo_strategy_step do
    field :set_weight,  :integer
    field :pause,       :canary_pause
    field :experiment,  :argo_experiment
    field :analysis,    :argo_analysis
  end

  object :argo_experiment do
    field :templates, list_of(:argo_experiment_template)
  end

  object :argo_analysis do
    field :templates, list_of(:argo_analysis_template)
  end

  object :argo_experiment_template do
    field :name, :string
  end

  object :argo_analysis_template do
    field :template_name, :string
  end

  object :canary_pause do
    field :duration, :string, resolve: fn
      %{duration: d}, _, _ -> {:ok, "#{d}"}
      _, _, _ -> {:ok, nil}
    end
  end

  object :pause_condition do
    field :reason,     :string
    field :start_time, :string
  end

  object :argo_rollout_status do
    field :abort,            :boolean
    field :phase,            :string
    field :replicas,         :integer
    field :ready_replicas,   :integer
    field :pause_conditions, list_of(:pause_condition)
    field :conditions,       list_of(:status_condition)
  end
end
