defmodule Watchman.GraphQl.Kubernetes do
  use Watchman.GraphQl.Schema.Base
  alias Watchman.GraphQl.Resolvers.{Forge, Kubernetes}
  alias Watchman.Middleware.Authenticated

  object :metadata do
    field :labels, list_of(:label_pair), resolve: fn %{labels: labels}, _, _ -> {:ok, make_labels(labels)} end
    field :annotations, list_of(:label_pair), resolve: fn %{annotations: labels}, _, _ -> {:ok, make_labels(labels)} end
    field :name, non_null(:string)
  end

  defp make_labels(map), do: Enum.map(map, fn {key, value} -> %{name: key, value: value} end)

  object :label_pair do
    field :name,  :string
    field :value, :string
  end

  import_types Watchman.GraphQl.Kubernetes.Pod
  import_types Watchman.GraphQl.Kubernetes.Deployment
  import_types Watchman.GraphQl.Kubernetes.StatefulSet
  import_types Watchman.GraphQl.Kubernetes.Service
  import_types Watchman.GraphQl.Kubernetes.Ingress

  object :application do
    field :name,   non_null(:string), resolve: fn %{metadata: %{name: name}}, _, _ -> {:ok, name} end
    field :spec,   non_null(:application_spec)
    field :status, non_null(:application_status)

    field :configuration, :string, resolve: &Forge.resolve_configuration/3
  end

  object :application_spec do
    field :descriptor, non_null(:application_descriptor)
    field :components, list_of(:component)
  end

  object :application_descriptor do
    field :type,        non_null(:string)
    field :version,     non_null(:string)
    field :description, non_null(:string)
    field :icons,       list_of(:string), resolve: fn %{icons: icons}, _, _ ->
      {:ok, Enum.map(icons, & &1.src)}
    end
  end

  object :component do
    field :group, non_null(:string)
    field :kind,  non_null(:string)
  end

  object :application_status do
    field :components,       list_of(:status_component)
    field :conditions,       list_of(:status_condition)
    field :components_ready, non_null(:string)
  end

  object :status_component do
    field :group,  :string
    field :kind,   non_null(:string)
    field :name,   non_null(:string)
    field :status, non_null(:string)
  end

  object :status_condition do
    field :message, non_null(:string)
    field :reason,  non_null(:string)
    field :status,  non_null(:string)
    field :type,    non_null(:string)
  end

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

  delta :application
end