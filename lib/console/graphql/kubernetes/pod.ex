defmodule Console.GraphQl.Kubernetes.Pod do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Kubernetes
  import Console.GraphQl.Kubernetes.Base

  object :pod do
    field :status,   non_null(:pod_status)
    field :spec,     non_null(:pod_spec)
    field :metadata, non_null(:metadata)

    field :raw, non_null(:string), resolve: fn model, _, _ -> encode(model) end

    field :logs, list_of(:string) do
      arg :container, non_null(:string)
      arg :since_seconds, non_null(:integer)

      resolve &Kubernetes.read_pod_logs/3
    end

    field :events, list_of(:event), resolve: fn
      model, _, _ -> Kubernetes.list_events(model)
    end
  end

  object :pod_status do
    field :message,            :string
    field :phase,              :string
    field :host_ip,            :string
    field :pod_ip,             :string
    field :reason,             :string
    field :conditions,         list_of(:pod_condition)
    field :container_statuses, list_of(:container_status)
    field :init_container_statuses, list_of(:container_status)
  end

  object :pod_condition do
    field :last_probe_time, :string
    field :last_transition_time, :string
    field :message, :string
    field :reason,  :string
    field :status,  :string
    field :type,    :string
  end

  object :container_status do
    field :restart_count, :integer
    field :ready,         :boolean
    field :name,          :string
    field :image,         :string
    field :state,         :container_state
  end

  object :container_state do
    field :running,    :running_state
    field :terminated, :terminated_state
    field :waiting,    :waiting_state
  end

  object :running_state do
    field :started_at, :string
  end

  object :terminated_state do
    field :exit_code,   :integer
    field :finished_at, :string
    field :started_at,  :string
    field :message,     :string
    field :reason,      :string
  end

  object :waiting_state do
    field :message, :string
    field :reason,  :string
  end

  object :pod_spec do
    field :service_account_name, :string
    field :node_name, :string
    field :containers, list_of(:container)
    field :init_containers, list_of(:container)
  end

  object :container do
    field :image,     :string
    field :name,      :string
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

  connection node_type: :pod
  delta :pod
end
