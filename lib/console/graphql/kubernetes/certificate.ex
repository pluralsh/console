defmodule Console.GraphQl.Kubernetes.Certificate do
  use Console.GraphQl.Schema.Base
  import Console.GraphQl.Kubernetes.Base
  alias Console.GraphQl.Resolvers.Kubernetes

  object :certificate do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:certificate_status)
    field :spec,     non_null(:certificate_spec)

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
    field :events, list_of(:event), resolve: fn model, _, _ -> Kubernetes.list_events(model) end
  end

  object :certificate_status do
    field :conditions,   list_of(:status_condition)
    field :not_after,    :string
    field :not_before,   :string
    field :renewal_time, :string
  end

  object :certificate_spec do
    field :dns_names,   list_of(:string)
    field :secret_name, non_null(:string)
    field :issuer_ref,  :issuer_ref
  end

  object :issuer_ref do
    field :group, :string
    field :kind,  :string
    field :name,  :string
  end

  object :certificate_mutations do
    field :delete_certificate, :boolean do
      middleware Authenticated
      middleware AdminRequired

      arg :name,      non_null(:string)
      arg :namespace, non_null(:string)

      safe_resolve &Kubernetes.delete_certificate/2
    end
  end
end
