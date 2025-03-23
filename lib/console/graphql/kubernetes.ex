defmodule Console.GraphQl.Kubernetes do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Kubernetes
  alias Console.Middleware.{Authenticated, AdminRequired, CheckComponent, CheckNamespace}

  object :metadata do
    field :labels,             list_of(:label_pair), resolve: fn %{labels: labels}, _, _ -> {:ok, make_labels(labels)} end
    field :annotations,        list_of(:label_pair), resolve: fn %{annotations: labels}, _, _ -> {:ok, make_labels(labels)} end
    field :name,               non_null(:string)
    field :namespace,          :string
    field :creation_timestamp, :string
    field :uid,                :string
  end

  object :status_condition do
    field :message, non_null(:string)
    field :reason,  non_null(:string)
    field :status,  non_null(:string)
    field :type,    non_null(:string)
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
      %{cpu: cpu}, _, _ -> {:ok, cpu}
      resources, _, _ -> {:ok, resources["cpu"]}
    end
    field :memory, :string, resolve: fn
      %{memory: memory}, _, _ -> {:ok, memory}
      resources, _, _ -> {:ok, resources["memory"]}
    end
  end

  object :kubernetes_unstructured do
    field :group,   :string
    field :version, non_null(:string)
    field :kind,    non_null(:string)
    field :raw,     :map, resolve: fn
      %{raw: %{"metadata" => %{"managedFields" => _}} = raw}, _, _ ->
        {:ok, put_in(raw["metadata"]["managedFields"], [])}
      %{raw: raw}, _, _ -> {:ok, raw}
    end

    field :metadata, non_null(:metadata)

    field :events,   list_of(:event), resolve: fn
      %{raw: %{"metadata" => %{"namespace" => ns, "uid" => uid}}}, _, _ ->
        Kubernetes.list_events(%{metadata: %{uid: uid, namespace: ns}})
      %{raw: %{"metadata" => %{"uid" => uid}}}, _, _ ->
        Kubernetes.list_all_events(%{metadata: %{uid: uid}})
    end
  end

  import_types Console.GraphQl.Kubernetes.Event
  import_types Console.GraphQl.Kubernetes.License
  import_types Console.GraphQl.Kubernetes.Pod
  import_types Console.GraphQl.Kubernetes.Deployment
  import_types Console.GraphQl.Kubernetes.StatefulSet
  import_types Console.GraphQl.Kubernetes.Service
  import_types Console.GraphQl.Kubernetes.Ingress
  import_types Console.GraphQl.Kubernetes.Node
  import_types Console.GraphQl.Kubernetes.CronJob
  # import_types Console.GraphQl.Kubernetes.LogFilter
  import_types Console.GraphQl.Kubernetes.Job
  import_types Console.GraphQl.Kubernetes.Certificate
  # import_types Console.GraphQl.Kubernetes.ConfigurationOverlay
  import_types Console.GraphQl.Kubernetes.VerticalPodAutoscaler
  import_types Console.GraphQl.Kubernetes.Namespace
  import_types Console.GraphQl.Kubernetes.Config
  import_types Console.GraphQl.Kubernetes.Canary
  import_types Console.GraphQl.Kubernetes.Rollout
  import_types Console.GraphQl.Kubernetes.UpgradePlan
  import_types Console.GraphQl.Kubernetes.DaemonSet
  import_types Console.GraphQl.Kubernetes.Plural

  object :kubernetes_queries do
    field :unstructured_resource, :kubernetes_unstructured do
      middleware Authenticated
      arg :group,     :string
      arg :version,   non_null(:string)
      arg :kind,      non_null(:string)
      arg :namespace, :string
      arg :name,      non_null(:string)
      service_authorized :read

      resolve &Kubernetes.raw_resource/2
    end

    field :service, :service do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_service/2
      middleware CheckComponent
    end

    field :cluster_info, :cluster_info do
      middleware Authenticated
      safe_resolve &Kubernetes.cluster_info/2
    end

    field :deployment, :deployment do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_deployment/2
      middleware CheckComponent
    end

    field :stateful_set, :stateful_set do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_stateful_set/2
      middleware CheckComponent
    end

    field :daemon_set, :daemon_set do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_daemon_set/2
      middleware CheckComponent
    end

    field :ingress, :ingress do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_ingress/2
      middleware CheckComponent
    end

    field :node, :node do
      middleware Authenticated
      arg :name, non_null(:string)
      cluster_authorized :read

      safe_resolve &Kubernetes.resolve_node/2
    end

    field :cron_job, :cron_job do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name, non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_cron_job/2
      middleware CheckComponent
    end

    field :job, :job do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name, non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_job/2
      middleware CheckComponent
    end

    field :certificate, :certificate do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_certificate/2
      middleware CheckComponent
    end

    field :pod, :pod do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name, non_null(:string)
      hybrid_authorized :read
      middleware CheckNamespace

      safe_resolve &Kubernetes.resolve_pod/2
    end

    connection field :pods, node_type: :pod do
      middleware Authenticated
      arg :namespace,  :string
      arg :namespaces, list_of(:string)
      cluster_authorized :read

      safe_resolve &Kubernetes.list_all_pods/2
    end

    field :cached_pods, list_of(:pod) do
      middleware Authenticated
      middleware AdminRequired
      arg :namespaces, list_of(:string)

      safe_resolve &Kubernetes.list_cached_pods/2
    end

    field :namespaces, list_of(:namespace) do
      middleware Authenticated
      cluster_authorized :read

      safe_resolve &Kubernetes.list_namespaces/2
    end

    field :node_metrics, list_of(:node_metric) do
      middleware Authenticated
      cluster_authorized :read

      safe_resolve &Kubernetes.list_node_metrics/2
    end

    field :node_metric, :node_metric do
      middleware Authenticated
      arg :name, non_null(:string)
      cluster_authorized :read

      safe_resolve &Kubernetes.resolve_node_metrics/2
    end

    field :canary, :canary do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_canary/2
      middleware CheckComponent
    end

    field :argo_rollout, :argo_rollout do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_rollout/2
      middleware CheckComponent
    end

    field :upgrade_plan, :upgrade_plan do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :read

      safe_resolve &Kubernetes.resolve_upgrade_plan/2
      middleware CheckComponent
    end

    import_fields :config_queries
    import_fields :plural_kubernetes_queries
  end

  object :kubernetes_mutations do
    field :delete_pod, :pod do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :write

      safe_resolve &Kubernetes.delete_pod/2
    end

    field :delete_job, :job do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      service_authorized :write

      safe_resolve &Kubernetes.delete_job/2
    end
  end

  object :kubernetes_subscriptions do
    field :pod_delta, :pod_delta do
      config fn _, _ -> {:ok, topic: "pods"} end
    end
  end
end
