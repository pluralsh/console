defmodule Console.GraphQl.Kubernetes.Ingress do
  use Console.GraphQl.Schema.Base
  import Console.GraphQl.Kubernetes.Base
  alias Console.GraphQl.Resolvers.Kubernetes

  object :ingress do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:service_status)
    field :spec,     non_null(:ingress_spec)

    field :certificates, list_of(:certificate), resolve: fn model, _, _ -> Kubernetes.ingress_certificates(model) end

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
    field :events, list_of(:event), resolve: fn model, _, _ -> Kubernetes.list_events(model) end
  end

  object :ingress_spec do
    field :ingress_class_name, :string
    field :rules,              list_of(:ingress_rule)
    field :tls,                list_of(:ingress_tls)
  end

  object :ingress_rule do
    field :host, :string
    field :http, :http_ingress_rule
  end

  object :http_ingress_rule do
    field :paths, list_of(:ingress_path)
  end

  object :ingress_path do
    field :backend, :ingress_backend
    field :path,    :string
  end

  object :ingress_backend do
    field :service_name, :string
    field :service_port, :string
  end

  object :ingress_tls do
    field :hosts, list_of(:string)
  end
end
