defmodule Watchman.GraphQl.Kubernetes.Pod do
  use Watchman.GraphQl.Schema.Base
  import Watchman.GraphQl.Kubernetes.Base

  object :pod do
    field :status,   non_null(:pod_status)
    field :spec,     non_null(:pod_spec)
    field :metadata, non_null(:metadata)

    field :raw, non_null(:string), resolve: fn model, _, _ -> encode(model) end
  end

  object :pod_status do
    field :message,            :string
    field :phase,              :string
    field :host_ip,            :string
    field :pod_ip,             :string
    field :reason,             :string
    field :container_statuses, list_of(:container_status)
  end

  object :container_status do
    field :restart_count, :integer
  end

  object :pod_spec do
    field :service_account_name, :string
    field :node_name, :string
    field :containers, list_of(:container)
  end

  object :container do
    field :image,     :string
    field :ports,     list_of(:port)
    field :resources, :resources
  end

  object :port do
    field :host_port,      :integer
    field :container_port, :integer
    field :protocol,       :string
  end

  object :resources do
    field :limits,   :resource_spec
    field :requests, :resource_spec
  end
end