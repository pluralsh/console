defmodule Console.GraphQl.Kubernetes.VerticalPodAutoscaler do
  use Console.GraphQl.Schema.Base

  object :vertical_pod_autoscaler do
    field :metadata, non_null(:metadata)
    field :spec,     non_null(:vertical_pod_autoscaler_spec)
    field :status,   :vertical_pod_autoscaler_status
  end

  object :cross_version_resource_target do
    field :api_version, :string
    field :kind,        :string
    field :name,        :string
  end

  object :vertical_pod_autoscaler_update_policy do
    field :update_mode, :string
  end

  object :vertical_pod_autoscaler_spec do
    field :target_ref,    non_null(:cross_version_resource_target)
    field :update_policy, non_null(:vertical_pod_autoscaler_update_policy)
  end

  object :vertical_pod_autoscaler_status do
    field :recommendation, :recommendation
  end

  object :recommendation do
    field :container_recommendations, list_of(:container_recommendation)
  end

  object :container_recommendation do
    field :name,            :string
    field :container_name,  :string
    field :target,          :resource_request
    field :lower_bound,     :resource_request
    field :upper_bound,     :resource_request
    field :uncapped_target, :resource_request
  end
end
