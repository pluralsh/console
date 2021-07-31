defmodule Console.GraphQl.Kubernetes.Node do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Kubernetes
  import Console.GraphQl.Kubernetes.Base

  object :node do
    field :status,   non_null(:node_status)
    field :spec,     non_null(:node_spec)
    field :metadata, non_null(:metadata)

    field :raw, non_null(:string), resolve: fn model, _, _ -> encode(model) end

    field :pods,     list_of(:pod), resolve: fn
      node, _, _ -> Kubernetes.list_pods_for_node(node)
    end

    field :events, list_of(:event), resolve: fn
      model, _, _ -> Kubernetes.list_all_events(model)
    end
  end

  object :node_status do
    field :allocatable, :map
    field :capacity,    :map
    field :phase,       :string
    field :conditions,  list_of(:node_condition)
  end

  object :node_condition do
    field :message, :string
    field :reason,  :string
    field :status,  :string
    field :type,    :string
  end

  object :node_spec do
    field :pod_cidr,      :string
    field :provider_id,   :string
    field :unschedulable, :boolean
  end

  object :node_usage do
    field :cpu,    :string
    field :memory, :string
  end

  object :node_metric do
    field :metadata,  non_null(:metadata)
    field :timestamp, :string
    field :window,    :string
    field :usage,     :node_usage
  end
end
