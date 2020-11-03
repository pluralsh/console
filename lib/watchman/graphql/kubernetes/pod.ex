defmodule Watchman.GraphQl.Kubernetes.Pod do
  use Watchman.GraphQl.Schema.Base

  object :pod do
    field :status,   non_null(:pod_status)
    field :spec,     non_null(:pod_spec)
    field :metadata, non_null(:metadata)
  end

  object :pod_status do
    field :message,            :string
    field :phase,              :string
    field :host_ip,             :string
    field :reason,             :string
    field :container_statuses, list_of(:container_status)
  end

  object :container_status do
    field :restart_count, :integer
  end

  object :pod_spec do
    field :service_account_name, :string
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

  object :resource_spec do
    field :cpu,    :string, resolve: fn resources, _, _ -> {:ok, resources["cpu"]} end
    field :memory, :string, resolve: fn resources, _, _ -> {:ok, resources["memory"]} end
  end
end