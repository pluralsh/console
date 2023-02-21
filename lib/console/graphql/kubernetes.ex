defmodule Console.GraphQl.Kubernetes do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Kubernetes
  alias Console.GraphQl.Resolvers.VPN
  alias Console.Middleware.{Authenticated, AdminRequired, Rbac, Feature}

  object :metadata do
    field :labels,      list_of(:label_pair), resolve: fn %{labels: labels}, _, _ -> {:ok, make_labels(labels)} end
    field :annotations, list_of(:label_pair), resolve: fn %{annotations: labels}, _, _ -> {:ok, make_labels(labels)} end
    field :name,        non_null(:string)
    field :namespace,   :string
  end

  object :result_status do
    field :message, :string
    field :reason,  :string
    field :status,  :string
  end

  object :secret_key_selector do
    field :name, non_null(:string)
    field :key,  :string
  end

  object :cluster_info do
    field :git_commit,  :string
    field :git_version, :string
    field :platform,    :string
    field :version,     :string, resolve: fn
      %{major: major, minor: minor}, _, _ -> {:ok, "#{major}.#{minor}"}
    end
  end

  defp make_labels(nil), do: []
  defp make_labels(map), do: Enum.map(map, fn {key, value} -> %{name: key, value: value} end)

  object :label_pair do
    field :name,  :string
    field :value, :string
  end

  object :resource_spec do
    field :cpu,    :string, resolve: fn
      resources, _, _ -> {:ok, resources["cpu"]}
    end
    field :memory, :string, resolve: fn
      resources, _, _ -> {:ok, resources["memory"]}
    end
  end

  import_types Console.GraphQl.Kubernetes.Event
  import_types Console.GraphQl.Kubernetes.License
  import_types Console.GraphQl.Kubernetes.Application
  import_types Console.GraphQl.Kubernetes.Pod
  import_types Console.GraphQl.Kubernetes.Deployment
  import_types Console.GraphQl.Kubernetes.StatefulSet
  import_types Console.GraphQl.Kubernetes.Service
  import_types Console.GraphQl.Kubernetes.Ingress
  import_types Console.GraphQl.Kubernetes.Node
  import_types Console.GraphQl.Kubernetes.CronJob
  import_types Console.GraphQl.Kubernetes.LogFilter
  import_types Console.GraphQl.Kubernetes.Job
  import_types Console.GraphQl.Kubernetes.Certificate
  import_types Console.GraphQl.Kubernetes.ConfigurationOverlay
  import_types Console.GraphQl.Kubernetes.VerticalPodAutoscaler
  import_types Console.GraphQl.Kubernetes.Namespace
  import_types Console.GraphQl.Kubernetes.VPN

  delta :application

  object :kubernetes_queries do
    field :service, :service do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      safe_resolve &Kubernetes.resolve_service/2
    end

    field :cluster_info, :cluster_info do
      middleware Authenticated
      safe_resolve &Kubernetes.cluster_info/2
    end

    field :deployment, :deployment do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      safe_resolve &Kubernetes.resolve_deployment/2
    end

    field :stateful_set, :stateful_set do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      safe_resolve &Kubernetes.resolve_stateful_set/2
    end

    field :ingress, :ingress do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      safe_resolve &Kubernetes.resolve_ingress/2
    end

    field :nodes, list_of(:node) do
      middleware Authenticated

      safe_resolve &Kubernetes.list_nodes/2
    end

    field :node, :node do
      middleware Authenticated
      arg :name, non_null(:string)

      safe_resolve &Kubernetes.resolve_node/2
    end

    field :cron_job, :cron_job do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name, non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      safe_resolve &Kubernetes.resolve_cron_job/2
    end

    field :job, :job do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name, non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      safe_resolve &Kubernetes.resolve_job/2
    end

    field :certificate, :certificate do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      safe_resolve &Kubernetes.resolve_certificate/2
    end

    field :pod, :pod do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name, non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      safe_resolve &Kubernetes.resolve_pod/2
    end

    connection field :pods, node_type: :pod do
      middleware Authenticated
      arg :namespaces, list_of(:string)

      safe_resolve &Kubernetes.list_all_pods/2
    end

    field :wireguard_peers, list_of(:wireguard_peer) do
      middleware Authenticated
      middleware AdminRequired

      safe_resolve &VPN.list_peers/2
    end

    field :my_wireguard_peers, list_of(:wireguard_peer) do
      middleware Authenticated

      safe_resolve &VPN.list_my_peers/2
    end

    field :wireguard_peer, :wireguard_peer do
      middleware Authenticated
      arg :name, non_null(:string)

      safe_resolve &VPN.get_peer/2
    end

    field :cached_pods, list_of(:pod) do
      middleware Authenticated
      arg :namespaces, list_of(:string)

      safe_resolve &Kubernetes.list_cached_pods/2
    end

    field :namespaces, list_of(:namespace) do
      middleware Authenticated

      safe_resolve &Kubernetes.list_namespaces/2
    end

    field :log_filters, list_of(:log_filter) do
      middleware Authenticated
      arg :namespace, non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      safe_resolve &Kubernetes.list_log_filters/2
    end

    field :node_metrics, list_of(:node_metric) do
      middleware Authenticated

      safe_resolve &Kubernetes.list_node_metrics/2
    end

    field :node_metric, :node_metric do
      middleware Authenticated
      arg :name, non_null(:string)

      safe_resolve &Kubernetes.resolve_node_metrics/2
    end

    field :configuration_overlays, list_of(:configuration_overlay) do
      middleware Authenticated
      arg :namespace, non_null(:string)

      safe_resolve &Kubernetes.list_configuration_overlays/2
    end
  end

  object :kubernetes_mutations do
    field :delete_pod, :pod do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :operate, arg: :namespace

      safe_resolve &Kubernetes.delete_pod/2
    end

    field :delete_job, :job do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :operate, arg: :namespace

      safe_resolve &Kubernetes.delete_job/2
    end

    field :delete_node, :node do
      middleware Authenticated
      middleware AdminRequired
      arg :name, non_null(:string)

      safe_resolve &Kubernetes.delete_node/2
    end

    field :overlay_configuration, :build do
      middleware Authenticated
      middleware Rbac, perm: :operate, arg: :namespace
      arg :namespace, non_null(:string)
      arg :context,   non_null(:map)

      safe_resolve &Kubernetes.execute_overlay/2
    end

    field :create_peer, :wireguard_peer do
      middleware Authenticated
      middleware AdminRequired
      middleware Feature, :vpn
      arg :user_id, :id
      arg :email,   :string
      arg :name,    non_null(:string)

      safe_resolve &VPN.create_peer/2
    end

    field :delete_peer, :wireguard_peer do
      middleware Authenticated
      middleware AdminRequired
      middleware Feature, :vpn
      arg :name,    non_null(:string)

      safe_resolve &VPN.delete_peer/2
    end
  end

  object :kubernetes_subscriptions do
    field :application_delta, :application_delta do
      config fn _, _ -> {:ok, topic: "applications"} end
    end

    field :pod_delta, :pod_delta do
      config fn _, _ -> {:ok, topic: "pods"} end
    end
  end
end
