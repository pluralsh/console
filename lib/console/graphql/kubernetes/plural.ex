defmodule Console.GraphQl.Kubernetes.Plural do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Kubernetes
  import Console.GraphQl.Kubernetes.Base

  object :plural_cluster do
    field :status,   non_null(:plural_object_status)
    field :metadata, non_null(:metadata)

    field :reference, :cluster, resolve: &Kubernetes.Plural.cluster/3

    field :raw, non_null(:string), resolve: fn model, _, _ -> encode(model) end

    field :events, list_of(:event), resolve: fn
      model, _, _ -> Kubernetes.list_all_events(model)
    end
  end

  object :plural_service_deployment do
    field :status,   non_null(:plural_object_status)
    field :metadata, non_null(:metadata)

    field :reference, :service_deployment, resolve: &Kubernetes.Plural.service/3

    field :raw, non_null(:string), resolve: fn model, _, _ -> encode(model) end

    field :events, list_of(:event), resolve: fn
      model, _, _ -> Kubernetes.list_all_events(model)
    end
  end

  object :plural_git_repository do
    field :status,   non_null(:plural_object_status)
    field :metadata, non_null(:metadata)

    field :reference, :git_repository, resolve: &Kubernetes.Plural.git_repository/3

    field :raw, non_null(:string), resolve: fn model, _, _ -> encode(model) end

    field :events, list_of(:event), resolve: fn
      model, _, _ -> Kubernetes.list_all_events(model)
    end
  end

  object :plural_object_status do
    field :id, :string
    field :conditions,  list_of(:status_condition)
  end

  object :plural_kubernetes_queries do
    field :plural_cluster, :plural_cluster do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_plural_cluster/2
    end

    field :plural_service_deployment, :plural_service_deployment do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_service_deployment/2
    end

    field :plural_git_repository, :plural_git_repository do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_git_repository/2
    end
  end
end
