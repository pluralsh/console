defmodule Watchman.GraphQl.Kubernetes.Ingress do
  use Watchman.GraphQl.Schema.Base

  object :ingress do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:service_status)
    field :spec,     non_null(:ingress_spec)
  end

  object :ingress_spec do
    field :rules, list_of(:ingress_rule)
    field :tls,   list_of(:ingress_tls)
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