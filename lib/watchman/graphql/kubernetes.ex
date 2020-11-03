defmodule Watchman.GraphQl.Kubernetes do
  use Watchman.GraphQl.Schema.Base
  alias Watchman.GraphQl.Resolvers.Kubernetes
  alias Watchman.Middleware.Authenticated

  object :metadata do
    field :labels, list_of(:label_pair), resolve: fn %{labels: labels}, _, _ -> {:ok, make_labels(labels)} end
    field :annotations, list_of(:label_pair), resolve: fn %{annotations: labels}, _, _ -> {:ok, make_labels(labels)} end
    field :name, non_null(:string)
  end

  object :result_status do
    field :message, :string
    field :reason,  :string
    field :status,  :string
  end

  defp make_labels(nil), do: []
  defp make_labels(map), do: Enum.map(map, fn {key, value} -> %{name: key, value: value} end)

  object :label_pair do
    field :name,  :string
    field :value, :string
  end

  import_types Watchman.GraphQl.Kubernetes.Application
  import_types Watchman.GraphQl.Kubernetes.Pod
  import_types Watchman.GraphQl.Kubernetes.Deployment
  import_types Watchman.GraphQl.Kubernetes.StatefulSet
  import_types Watchman.GraphQl.Kubernetes.Service
  import_types Watchman.GraphQl.Kubernetes.Ingress

  delta :application

  object :kubernetes_queries do
    field :service, :service do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)

      resolve &Kubernetes.resolve_service/2
    end

    field :deployment, :deployment do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)

      resolve &Kubernetes.resolve_deployment/2
    end

    field :stateful_set, :stateful_set do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)

      resolve &Kubernetes.resolve_stateful_set/2
    end

    field :ingress, :ingress do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)

      resolve &Kubernetes.resolve_ingress/2
    end
  end

  object :kubernetes_mutations do
    field :delete_pod, :pod do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)

      resolve &Kubernetes.delete_pod/2
    end
  end
end