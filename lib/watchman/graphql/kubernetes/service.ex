defmodule Watchman.GraphQl.Kubernetes.Service do
  use Watchman.GraphQl.Schema.Base
  alias Watchman.GraphQl.Resolvers.Kubernetes

  object :service do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:service_status)
    field :spec,     non_null(:service_spec)

    field :pods, list_of(:pod), resolve: fn
      %{metadata: metadata, spec: %{selector: selector}}, _, _ ->
        Kubernetes.list_pods(metadata, selector)
    end
  end

  object :service_status do
    field :load_balancer, :load_balancer_status
  end

  object :load_balancer_status do
    field :ingress, list_of(:load_balancer_ingress_status)
  end

  object :load_balancer_ingress_status do
    field :hostname, :string
    field :ip, :string
  end

  object :service_spec do
    field :type,       :string
    field :cluster_ip, :string
    field :selector,   :map
    field :ports,      list_of(:service_port)
  end

  object :service_port do
    field :name,        :string
    field :protocol,    :string
    field :port,        :integer
    field :target_port, :integer
  end
end