defmodule Watchman.GraphQl.Kubernetes.Node do
  use Watchman.GraphQl.Schema.Base
  alias Watchman.GraphQl.Resolvers.Kubernetes

  object :node do
    field :status,   non_null(:node_status)
    field :spec,     non_null(:node_spec)
    field :metadata, non_null(:metadata)
    field :pods,     list_of(:pod), resolve: fn
      node, _, _ -> Kubernetes.list_pods_for_node(node)
    end
  end

  object :node_status do
    field :allocatable, :resource_spec
    field :capacity,    :resource_spec
    field :phase,       :string
  end

  object :node_spec do
    field :pod_cidr,      :string
    field :provider_id,   :string
    field :unschedulable, :boolean
  end
end