defmodule Console.GraphQl.Kubernetes.Config do
  use Console.GraphQl.Schema.Base
  import Console.GraphQl.Kubernetes.Base
  alias Console.GraphQl.Resolvers.Kubernetes

  object :config_map do
    field :metadata, non_null(:metadata)
    field :data,     non_null(:map)

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
  end

  object :secret do
    field :metadata, non_null(:metadata)
    field :type,     :string
    field :data,     non_null(:map)
  end

  object :config_queries do
    field :config_map, :config_map do
      middleware Authenticated
      service_authorized :read
      namespace_args()

      safe_resolve &Kubernetes.resolve_config_map/2
    end

    field :secret, :secret do
      middleware Authenticated
      service_authorized :operate
      namespace_args()

      safe_resolve &Kubernetes.resolve_secret/2
    end

    field :config_maps, list_of(:config_map) do
      middleware Authenticated
      arg :namespace, non_null(:string)

      safe_resolve &Kubernetes.list_config_maps/2
    end

    field :secrets, list_of(:secret) do
      middleware Authenticated
      middleware Rbac, perm: :operate, arg: :namespace
      arg :namespace, non_null(:string)

      safe_resolve &Kubernetes.list_secrets/2
    end
  end
end
