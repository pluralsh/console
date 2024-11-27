defmodule Console.GraphQl.Deployments.Service do
  use Console.GraphQl.Schema.Base
  alias Console.Schema.{ServiceComponent, Service}
  alias Console.GraphQl.Resolvers.{Deployments}

  ecto_enum :component_state, ServiceComponent.State
  ecto_enum :service_deployment_status, Service.Status
  ecto_enum :service_promotion, Service.Promotion

  input_object :service_deployment_attributes do
    field :name,             non_null(:string)
    field :namespace,        non_null(:string)
    field :version,          :string
    field :docs_path,        :string
    field :sync_config,      :sync_config_attributes
    field :protect,          :boolean
    field :repository_id,    :id
    field :dry_run,          :boolean
    field :interval,         :string
    field :templated,        :boolean, description: "if you should apply liquid templating to raw yaml files, defaults to true"
    field :git,              :git_ref_attributes
    field :helm,             :helm_config_attributes
    field :kustomize,        :kustomize_attributes
    field :parent_id,        :id
    field :configuration,    list_of(:config_attributes)
    field :dependencies,     list_of(:service_dependency_attributes)
    field :read_bindings,    list_of(:policy_binding_attributes)
    field :write_bindings,   list_of(:policy_binding_attributes)
    field :context_bindings, list_of(:context_binding_attributes)
    field :imports,          list_of(:service_import_attributes)
  end

  input_object :service_import_attributes do
    field :stack_id, non_null(:id)
  end

  input_object :sync_config_attributes do
    field :create_namespace,   :boolean
    field :enforce_namespace,  :boolean
    field :namespace_metadata, :metadata_attributes
  end

  input_object :helm_config_attributes do
    field :values,        :string
    field :values_files,  list_of(:string)
    field :chart,         :string
    field :version,       :string
    field :release,       :string
    field :url,           :string
    field :ignore_hooks,  :boolean
    field :set,           :helm_value_attributes
    field :repository,    :namespaced_name
    field :git,           :git_ref_attributes
    field :repository_id, :id, description: "pointer to a Plural GitRepository"
  end

  input_object :metadata_attributes do
    field :labels,      :json
    field :annotations, :json
  end

  input_object :helm_value_attributes do
    field :name,  :string, description: "helm value name, can be deeply nested via dot like `image.tag`"
    field :value, :string, description: "value of the attribute"
  end

  input_object :service_update_attributes do
    field :version,          :string
    field :protect,          :boolean
    field :dry_run,          :boolean
    field :interval,         :string
    field :sync_config,      :sync_config_attributes
    field :templated,        :boolean, description: "if you should apply liquid templating to raw yaml files, defaults to true"
    field :git,              :git_ref_attributes
    field :helm,             :helm_config_attributes
    field :configuration,    list_of(:config_attributes)
    field :kustomize,        :kustomize_attributes
    field :parent_id,        :id
    field :dependencies,     list_of(:service_dependency_attributes)
    field :read_bindings,    list_of(:policy_binding_attributes)
    field :write_bindings,   list_of(:policy_binding_attributes)
    field :context_bindings, list_of(:context_binding_attributes)
  end

  input_object :service_clone_attributes do
    field :name,          non_null(:string)
    field :namespace,     :string
    field :configuration, list_of(:config_attributes)
  end

  input_object :git_ref_attributes do
    field :ref,    non_null(:string)
    field :folder, non_null(:string)
    field :files,  list_of(non_null(:string))
  end

  input_object :config_attributes do
    field :name,  non_null(:string)
    field :value, :string
  end

  input_object :component_attributes do
    field :state,      :component_state
    field :synced,     non_null(:boolean)
    field :group,      non_null(:string)
    field :version,    non_null(:string)
    field :kind,       non_null(:string)
    field :namespace,  non_null(:string)
    field :name,       non_null(:string)
    field :content,    :component_content_attributes
  end

  @desc "the content of a component when visualized in dry run state"
  input_object :component_content_attributes do
    field :desired, :string, description: "the desired state of a service component as determined from the configured manifests"
    field :live,    :string
  end

  input_object :service_error_attributes do
    field :source,  non_null(:string)
    field :message, non_null(:string)
  end

  @desc "A reusable configuration context, useful for plumbing data from external tools like terraform/pulumi/etc"
  input_object :service_context_attributes do
    field :configuration, :json
    field :secrets,       list_of(:config_attributes)
  end

  @desc "a binding from a service to a service context"
  input_object :context_binding_attributes do
    field :context_id, non_null(:string)
  end

  @desc "A named depedency of a service, will prevent applying any manifests until the dependency has become ready"
  input_object :service_dependency_attributes do
    field :name, non_null(:string)
  end

  input_object :kustomize_attributes do
    field :path, non_null(:string), description: "the path to the kustomization file to use"
  end

  @desc "a reference to a service deployed from a git repo into a cluster"
  object :service_deployment do
    field :id,               non_null(:id), description: "internal id of this service"
    field :name,             non_null(:string), description: "human readable name of this service, must be unique per cluster"
    field :namespace,        non_null(:string), description: "kubernetes namespace this service will be deployed to"
    field :status,           non_null(:service_deployment_status), description: "A summary status enum for the health of this service"
    field :version,          non_null(:string), description: "semver of this service"
    field :interval,         :string, description: "the desired sync interval for this service"
    field :git,              :git_ref,   description: "description on where in git the service's manifests should be fetched"
    field :helm,             :helm_spec, description: "description of how helm charts should be applied", resolve: fn
      %{helm: %{} = helm} = svc, _, _ ->
        {:ok, Map.put(helm, :parent, svc)}
      svc, _, _ -> {:ok, svc.helm}
    end
    field :promotion,        :service_promotion, description: "how you'd like to perform a canary promotion"
    field :templated,        :boolean, description: "if you should apply liquid templating to raw yaml files, defaults to true"
    field :protect,          :boolean, description: "if true, deletion of this service is not allowed"
    field :sha,              :string, description: "latest git sha we pulled from"
    field :tarball,          :string, resolve: &Deployments.tarball/3, description: "https url to fetch the latest tarball of kubernetes manifests"
    field :component_status, :string, description: "a n / m representation of the number of healthy components of this service"
    field :sync_config,      :sync_config, description: "settings for advanced tuning of the sync process"
    field :kustomize,        :kustomize, description: "kustomize related service metadata"
    field :message,          :string, description: "the commit message currently in use"
    field :deleted_at,       :datetime, description: "the time this service was scheduled for deletion"
    field :dry_run,          :boolean, description: "whether this service should not actively reconcile state and instead simply report pending changes"

    @desc "fetches the /docs directory within this services git tree.  This is a heavy operation and should NOT be used in list queries"
    field :docs, list_of(:git_file), resolve: &Deployments.docs/3

    field :repository, :git_repository, resolve: dataloader(Deployments), description: "the git repo of this service"

    field :helm_repository, :flux_helm_repository, resolve: fn
      svc, _, %{context: %{loader: loader}} ->
        manual_dataloader(loader, Console.GraphQl.Resolvers.HelmRepositoryLoader, :helm, svc)
    end

    @desc "Queries logs for a service out of loki"
    field :logs, list_of(:log_stream) do
      arg :query,      non_null(:loki_query)
      arg :start,      :long
      arg :end,        :long
      arg :limit,      non_null(:integer)

      resolve &Deployments.service_logs/3
    end

    field :read_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "read policy for this service"
    field :write_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "write policy of this service"

    field :parent,         :service_deployment, resolve: dataloader(Deployments), description: "the service that owns this service in a service-of-services setup"
    field :errors,         list_of(:service_error), resolve: dataloader(Deployments), description: "a list of errors generated by the deployment operator"
    field :cluster,        :cluster, resolve: dataloader(Deployments), description: "the cluster this service is deployed into"
    field :revision,       :revision, resolve: dataloader(Deployments), description: "the current revision of this service"
    field :configuration,  list_of(:service_configuration), resolve: &Deployments.service_configuration/3, description: "possibly secret configuration used to template the manifests of this service"
    field :components,     list_of(:service_component), resolve: dataloader(Deployments), description: "the kubernetes component of a service"
    field :global_service, :global_service, resolve: dataloader(Deployments), description: "the global service this service is the source for"
    field :owner,          :global_service, resolve: dataloader(Deployments), description: "whether this service is controlled by a global service"
    field :contexts,       list_of(:service_context), resolve: dataloader(Deployments), description: "bound contexts for this service"
    field :dependencies,   list_of(:service_dependency), resolve: dataloader(Deployments), description: "the dependencies of this service, actualization will not happen until all are HEALTHY"
    field :imports,        list_of(:service_import), resolve: dataloader(Deployments), description: "imports from stack outputs"
    field :insight,        :ai_insight, resolve: dataloader(Deployments), description: "an insight explaining the state of this service"
    field :vulns,          :service_vuln, resolve: dataloader(Deployments), description: "sideload detected vulnerabilities for this service"

    @desc "a relay connection of all revisions of this service, these are periodically pruned up to a history limit"
    connection field :revisions, node_type: :revision do
      resolve &Deployments.list_revisions/3
    end

    @desc "list all alerts discovered for this service"
    connection field :alerts, node_type: :alert do
      resolve &Deployments.list_alerts/3
    end

    field :component_metrics, :service_component_metrics do
      arg :component_id, non_null(:id)
      arg :start,        :datetime
      arg :stop,         :datetime
      arg :step,         :string

      resolve &Deployments.metrics/3
    end

    field :editable, :boolean, resolve: &Deployments.editable/3, description: "whether this service is editable"

    timestamps()
  end

  object :service_component_metrics do
    field :cpu, list_of(:metric_response)
    field :mem, list_of(:metric_response)
    field :pod_cpu, list_of(:metric_response)
    field :pod_mem, list_of(:metric_response)
  end

  @desc "a representation of a past revision of a service"
  object :revision do
    field :id,      non_null(:id), description: "id of this revision"
    field :version, non_null(:string), description: "the service's semver"
    field :git,     :git_ref, description: "git spec of the prior revision"
    field :helm,    :helm_spec, description: "description of how helm charts should be applied"
    field :sha,     :string, description: "the sha this service was pulled from"
    field :message, :string, description: "the commit message for this revision"

    timestamps()
  end

  @desc "a representation of where to pull manifests from git"
  object :git_ref do
    field :ref,    non_null(:string), description: "a general git ref, either a branch name or commit sha understandable by `git checkout <ref>`"
    field :folder, non_null(:string), description: "the folder manifests live under"
    field :files,  list_of(non_null(:string)), description: "a list of individual files to include as well"
  end

  object :object_reference do
    field :name,      :string
    field :namespace, :string
  end

  object :helm_spec do
    field :chart,         :string, description: "the name of the chart this service is using"
    field :url,           :string, description: "the helm repository url to use"
    field :values,        :string,
      description: "a helm values file to use with this service, requires auth and so is heavy to query",
      resolve: &Deployments.helm_values/3
    field :release,       :string
    field :ignore_hooks,  :boolean
    field :git,           :git_ref, description: "spec of where to find the chart in git"
    field :repository_id, :id, description: "a git repository in Plural to use as a source"
    field :repository,    :object_reference, description: "pointer to the flux helm repository resource used for this chart"
    field :version,       :string, description: "the chart version in use currently"
    field :set,           list_of(:helm_value), description: "a list of helm name/value pairs to precisely set individual values"
    field :values_files,  list_of(:string), description: "a list of relative paths to values files to use for helm applies"
  end

  @desc "a configuration item k/v pair"
  object :service_configuration do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  @desc "a (possibly nested) helm value pair"
  object :helm_value do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  @desc "metadata needed for configuring kustomize"
  object :kustomize do
    field :path, non_null(:string)
  end

  @desc "representation of a kubernetes component deployed by a service"
  object :service_component do
    field :id,         non_null(:id), description: "internal id"
    field :state,      :component_state, description: "kubernetes component health enum"
    field :synced,     non_null(:boolean), description: "whether this component has been applied to the k8s api"
    field :group,      :string, description: "api group of this resource"
    field :version,    :string, description: "api version of this resource"
    field :kind,       non_null(:string), description: "api kind of this resource"
    field :namespace,  :string, description: "kubernetes namespace of this resource"
    field :name,       non_null(:string), description: "kubernetes name of this resource"

    field :insight, :ai_insight, resolve: dataloader(Deployments), description: "an insight explaining the state of this component"
    field :content, :component_content, resolve: dataloader(Deployments), description: "the live and desired states of this service component"
    field :service, :service_deployment, resolve: dataloader(Deployments), description: "the service this component belongs to"
    field :api_deprecations, list_of(:api_deprecation), resolve: dataloader(Deployments), description: "any api deprecations discovered from this component"
  end

  @desc "dry run content of a service component"
  object :component_content do
    field :id,      non_null(:id)
    field :live,    :string
    field :desired, :string, description: "the inferred desired state of this component"

    timestamps()
  end

  @desc "a representation of a kubernetes api deprecation"
  object :api_deprecation do
    field :deprecated_in, :string, description: "the kubernetes version the deprecation was posted"
    field :removed_in,    :string, description: "the kubernetes version the api version will be removed and unusable in"
    field :replacement,   :string, description: "the api you can replace this resource with"
    field :available_in,  :string, description: "the kubernetes version the replacement api was created in"
    field :blocking,      :boolean, description: "whether you cannot safely upgrade to the next kubernetes version if this deprecation exists"

    field :component, :service_component, resolve: dataloader(Deployments), description: "the component of this deprecation"
  end


  @desc "an error sent from the deploy operator about sync progress"
  object :service_error do
    field :source, non_null(:string)
    field :message, non_null(:string)
  end

  @desc "a file fetched from a git repository, eg a docs .md file"
  object :git_file do
    field :path,    non_null(:string)
    field :content, non_null(:string)
  end

  @desc "a rollup count of the statuses of services in a query"
  object :service_status_count do
    field :status, non_null(:service_deployment_status)
    field :count,  non_null(:integer)
  end

  @desc "Advanced configuration of how to sync resources"
  object :sync_config do
    field :create_namespace,   :boolean, description: "whether the agent should auto-create the namespace for this service"
    field :enforce_namespace,  :boolean, description: "Whether to require all resources are placed in the same namespace"
    field :namespace_metadata, :namespace_metadata
  end

  @desc "metadata fields for created namespaces"
  object :namespace_metadata do
    field :labels,      :map
    field :annotations, :map
  end

  @desc "A reusable bundle of configuration designed to make it easy to communicate between tools like tf/pulumi and k8s"
  object :service_context do
    field :id,            non_null(:id)
    field :name,          non_null(:string)
    field :configuration, :map
    field :secrets,       list_of(:service_configuration)

    timestamps()
  end

  @desc "A dependency of a service, the service will not actualize until all dependencies are ready"
  object :service_dependency do
    field :id,     non_null(:id)
    field :status, :service_deployment_status
    field :name,   non_null(:string)

    timestamps()
  end

  @desc "Import of stack data into a service's context"
  object :service_import do
    field :id,      non_null(:id)
    field :stack,   :infrastructure_stack, resolve: dataloader(Deployments), description: "The stack you're importing from"
    field :outputs, list_of(:stack_output), resolve: dataloader(Deployments), description: "The outputs of that stack"

    timestamps()
  end

  @desc "A tree view of the kubernetes object hierarchy beneath a component"
  object :component_tree do
    field :root,         :kubernetes_unstructured
    field :deployments,  list_of(:deployment)
    field :statefulsets, list_of(:stateful_set)
    field :replicasets,  list_of(:replica_set)
    field :daemonsets,   list_of(:daemon_set)
    field :services,     list_of(:service)
    field :ingresses,    list_of(:ingress)
    field :cronjobs,     list_of(:cron_job)
    field :configmaps,   list_of(:config_map)
    field :secrets,      list_of(:secret)
    field :certificates, list_of(:certificate)

    field :edges, list_of(:resource_edge)
  end

  @desc "an edge representing mapping from kubernetes object metadata.uid -> metadata.uid"
  object :resource_edge do
    field :from, non_null(:string)
    field :to,   non_null(:string)
  end

  connection node_type: :service_deployment
  connection node_type: :revision

  delta :service_deployment

  object :public_service_queries do
    @desc "the services deployed in the current cluster, to be polled by the deploy operator"
    field :cluster_services, list_of(:service_deployment) do
      middleware ClusterAuthenticated

      resolve &Deployments.cluster_services/2
    end

    connection field :paged_cluster_services, node_type: :service_deployment do
      middleware ClusterAuthenticated

      resolve &Deployments.paged_cluster_services/2
    end

    @desc "fetches details of this service deployment, and can be called by the deploy operator"
    field :service_deployment, :service_deployment do
      middleware Authenticated, :cluster
      arg :id,      :id
      arg :cluster, :string, description: "the handle of the cluster for this service"
      arg :name,    :string

      resolve &Deployments.resolve_service/2
    end
  end

  object :public_service_mutations do
    @desc "updates only the components of a given service, to be sent after deploy operator syncs"
    field :update_service_components, :service_deployment do
      middleware ClusterAuthenticated
      arg :id,          non_null(:id)
      arg :components,  list_of(:component_attributes)
      arg :revision_id, :id
      arg :sha,         :string
      arg :errors,      list_of(:service_error_attributes)

      resolve &Deployments.update_service_components/2
    end

    @desc "save the manifests in cache to be retrieved by the requesting user"
    field :save_manifests, :boolean do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)
      arg :manifests, list_of(:string)

      resolve &Deployments.save_manifests/2
    end
  end

  object :service_queries do
    connection field :service_deployments, node_type: :service_deployment do
      middleware Authenticated
      arg :cluster_id, :id
      arg :q,          :string
      arg :status,     :service_deployment_status
      arg :errored,    :boolean
      arg :project_id, :id, description: "a project to filter services w/in"
      arg :cluster,    :string, description: "the handle of the cluster for this service"

      resolve &Deployments.list_services/2
    end

    @desc "Renders a filtered list of services and all their descendents returned as a paginated connection"
    connection field :service_tree, node_type: :service_deployment do
      middleware Authenticated
      arg :cluster_id, :id
      arg :q,          :string
      arg :status,     :service_deployment_status
      arg :errored,    :boolean
      arg :project_id, :id, description: "a project to filter services w/in"

      resolve &Deployments.service_tree/2
    end

    field :service_statuses, list_of(:service_status_count) do
      middleware Authenticated
      arg :cluster_id, :id
      arg :q,          :string
      arg :status,     :service_deployment_status
      arg :project_id, :id

      resolve &Deployments.service_statuses/2
    end

    field :service_context, :service_context do
      middleware Authenticated
      arg :name, non_null(:string)

      resolve &Deployments.resolve_service_context/2
    end

    @desc "renders a full hierarchy of resources recursively owned by this component (useful for CRD views)"
    field :component_tree, :component_tree do
      middleware Authenticated
      arg :id, non_null(:id), description: "the id of the service component for the tree view"

      resolve &Deployments.tree/2
    end

    @desc "request manifests from an agent, to be returned by a future call to fetchManifests"
    field :request_manifests, :service_deployment do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.request_manifests/2
    end

    @desc "Fetches the manifests from cache once the agent has given us them, will be null otherwise"
    field :fetch_manifests, list_of(:string) do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.fetch_manifests/2
    end
  end

  object :service_mutations do
    field :create_service_deployment, :service_deployment do
      middleware Authenticated
      middleware Feature, :cd

      arg :cluster_id, :id
      arg :cluster,    :string, description: "the handle of the cluster for this service"
      arg :attributes, non_null(:service_deployment_attributes)

      resolve &Deployments.create_service/2
    end

    field :update_service_deployment, :service_deployment do
      middleware Authenticated
      middleware Feature, :cd

      arg :id,         :id
      arg :cluster,    :string, description: "the handle of the cluster for this service"
      arg :name,       :string
      arg :attributes, non_null(:service_update_attributes)

      resolve &Deployments.update_service/2
    end

    field :delete_service_deployment, :service_deployment do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_service/2
    end

    @desc "removes a service from storage, but bypasses waiting for the agent to fully drain it from its hosting cluster"
    field :detach_service_deployment, :service_deployment do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.detach_service/2
    end

    @desc "merges configuration for a service"
    field :merge_service, :service_deployment do
      middleware Authenticated
      arg :id,            non_null(:id)
      arg :configuration, list_of(:config_attributes)

      resolve &Deployments.merge_service/2
    end

    @desc "rewires this service to use the given revision id"
    field :rollback_service, :service_deployment do
      middleware Authenticated
      arg :id,          :id
      arg :cluster,     :string, description: "the handle of the cluster for this service"
      arg :name,        :string
      arg :revision_id, non_null(:id)

      resolve &Deployments.rollback/2
    end

    @desc "clones the spec of the given service to be deployed either into a new namespace or new cluster"
    field :clone_service, :service_deployment do
      middleware Authenticated
      arg :service_id, :id
      arg :cluster,    :string, description: "the handle of the cluster for this service"
      arg :name,       :string
      arg :cluster_id, non_null(:id)
      arg :attributes, non_null(:service_clone_attributes)

      resolve &Deployments.clone_service/2
    end

    field :kick_service, :service_deployment do
      middleware Authenticated
      arg :service_id, :id
      arg :cluster,    :string, description: "the handle of the cluster for this service"
      arg :name,       :string

      resolve &Deployments.kick_service/2
    end

    field :self_manage, :service_deployment do
      middleware Authenticated
      arg :values, non_null(:string)

      resolve &Deployments.self_manage/2
    end

    @desc "marks a service as being able to proceed to the next stage of a canary rollout"
    field :proceed, :service_deployment do
      middleware Authenticated
      arg :id,        :id
      arg :cluster,   :string, description: "the handle of the cluster for this service"
      arg :name,      :string
      arg :promotion, :service_promotion

      resolve &Deployments.proceed/2
    end

    field :save_service_context, :service_context do
      middleware Authenticated
      arg :name,       non_null(:string)
      arg :attributes, non_null(:service_context_attributes)

      resolve &Deployments.save_service_context/2
    end

    field :delete_service_context, :service_context do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_service_context/2
    end
  end

  object :service_subscriptions do
    field :service_deployment_delta, :service_deployment_delta do
      arg :id, non_null(:id)

      config fn args, ctx ->
        with {:ok, svc} <- Deployments.resolve_service(args, ctx),
          do: {:ok, topic: "services:#{svc.id}"}
      end
    end
  end
end
