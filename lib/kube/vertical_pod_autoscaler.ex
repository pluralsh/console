defmodule Kube.VerticalPodAutoscaler do
  use Kazan.Model

  defmodule UpdatePolicy do
    use Kazan.Model

    defmodel "UpdatePolicy", "autoscaling.k8s.io", "v1" do
      property :update_mode, "updateMode", :string
    end
  end

  defmodule ContainerResources do
    use Kazan.Model

    defmodel "ContainerResources", "autoscaling.k8s.io", "v1" do
      property :cpu,    "cpu",    :string
      property :memory, "memory", :string
    end
  end

  defmodule ContainerRecommendation do
    use Kazan.Model
    alias Kube.VerticalPodAutoscaler.{ContainerResources}

    defmodel "RecommendedContainerResources", "autoscaling.k8s.io", "v1" do
      property :name,            "containerName",  :string
      property :containerName,   "containerName",  :string
      property :target,          "target",         ContainerResources
      property :lower_bound,     "lowerBound",     ContainerResources
      property :upper_bound,     "upperBound",     ContainerResources
      property :uncapped_target, "uncappedTarget", ContainerResources
    end
  end

  defmodule Recommendation do
    use Kazan.Model

    defmodel "RecommendedPodResources", "autoscaling.k8s.io", "v1" do
      property :container_recommendations, "containerRecommendations", {:array, Kube.VerticalPodAutoscaler.ContainerRecommendation}
    end
  end

  defmodule Status do
    use Kazan.Model

    defmodel "VerticalPodAutoscalerStatus", "autoscaling.k8s.io", "v1" do
      property :recommendation, "recommendation", Kube.VerticalPodAutoscaler.Recommendation
    end
  end

  defmodule Spec do
    use Kazan.Model
    alias Kube.VerticalPodAutoscaler.{UpdatePolicy}
    alias Kazan.Apis.Autoscaling.V1.CrossVersionObjectReference

    defmodel  "VerticalPodAutoscalerSpec", "autoscaling.k8s.io", "v1" do
      property :target_ref,    "targetRef", CrossVersionObjectReference
      property :update_policy, "updatePolicy", UpdatePolicy
    end
  end

  defmodel "VerticalPodAutoscaler", "autoscaling.k8s.io", "v1" do
    property :spec,   "spec", Spec
    property :status, "status", Status
  end
end

defmodule Kube.VerticalPodAutoscalerList do
  use Kazan.Model

  defmodellist "VerticalPodAutoscalerList",
               "autoscaling.k8s.io",
               "v1",
               Kube.VerticalPodAutoscaler
end
