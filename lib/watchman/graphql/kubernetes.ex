defmodule Watchman.GraphQl.Kubernetes do
  use Watchman.GraphQl.Schema.Base
  alias Watchman.GraphQl.Resolvers.Kubernetes
  alias Watchman.Middleware.{Authenticated, Rbac}

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

  defp make_labels(nil), do: []
  defp make_labels(map), do: Enum.map(map, fn {key, value} -> %{name: key, value: value} end)

  object :label_pair do
    field :name,  :string
    field :value, :string
  end

  object :resource_spec do
    field :cpu,    :string, resolve: fn resources, _, _ -> {:ok, resources["cpu"]} end
    field :memory, :string, resolve: fn resources, _, _ -> {:ok, resources["memory"]} end
  end

  import_types Watchman.GraphQl.Kubernetes.Event
  import_types Watchman.GraphQl.Kubernetes.Application
  import_types Watchman.GraphQl.Kubernetes.Pod
  import_types Watchman.GraphQl.Kubernetes.Deployment
  import_types Watchman.GraphQl.Kubernetes.StatefulSet
  import_types Watchman.GraphQl.Kubernetes.Service
  import_types Watchman.GraphQl.Kubernetes.Ingress
  import_types Watchman.GraphQl.Kubernetes.Node
  import_types Watchman.GraphQl.Kubernetes.CronJob
  import_types Watchman.GraphQl.Kubernetes.LogFilter

  delta :application

  object :kubernetes_queries do
    field :service, :service do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      resolve &Kubernetes.resolve_service/2
    end

    field :deployment, :deployment do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      resolve &Kubernetes.resolve_deployment/2
    end

    field :stateful_set, :stateful_set do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      resolve &Kubernetes.resolve_stateful_set/2
    end

    field :ingress, :ingress do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      resolve &Kubernetes.resolve_ingress/2
    end

    field :nodes, list_of(:node) do
      middleware Authenticated

      resolve &Kubernetes.list_nodes/2
    end

    field :node, :node do
      middleware Authenticated
      arg :name, non_null(:string)

      resolve &Kubernetes.resolve_node/2
    end

    field :cron_job, :cron_job do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name, non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      resolve &Kubernetes.resolve_cron_job/2
    end

    field :pod, :pod do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name, non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      resolve &Kubernetes.resolve_pod/2
    end

    field :log_filters, list_of(:log_filter) do
      middleware Authenticated
      arg :namespace, non_null(:string)
      middleware Rbac, perm: :read, arg: :namespace

      resolve &Kubernetes.list_log_filters/2
    end
  end

  object :kubernetes_mutations do
    field :delete_pod, :pod do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      middleware Rbac, perm: :operate, arg: :namespace

      resolve &Kubernetes.delete_pod/2
    end
  end
end