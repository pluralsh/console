defmodule Console.GraphQl.Deployments.Service do
  use Console.GraphQl.Schema.Base
  alias Console.Schema.{ServiceComponent, Service}
  alias Console.GraphQl.Resolvers.{Deployments}

  ecto_enum :component_state, ServiceComponent.State
  ecto_enum :service_deployment_status, Service.Status

  input_object :service_deployment_attributes do
    field :name,           non_null(:string)
    field :namespace,      non_null(:string)
    field :version,        :string
    field :docs_path,      :string
    field :sync_config,    :sync_config_attributes
    field :protect,        :boolean
    field :repository_id,  non_null(:id)
    field :git,            :git_ref_attributes
    field :helm,           :helm_config_attributes
    field :kustomize,      :kustomize_attributes
    field :configuration,  list_of(:config_attributes)
    field :read_bindings,  list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)
  end

  input_object :sync_config_attributes do
    field :namespace_metadata, :metadata_attributes
    field :diff_normalizer,    :diff_normalizer_attributes
  end

  input_object :helm_config_attributes do
    field :values,       :string
    field :values_files, list_of(:string)
    field :chart,        :string
    field :version,      :string
    field :repository,   :namespaced_name
  end

  input_object :metadata_attributes do
    field :labels,      :map
    field :annotations, :map
  end

  input_object :diff_normalizer_attributes do
    field :group,        non_null(:string)
    field :kind,         non_null(:string)
    field :name,         non_null(:string)
    field :namespace,    non_null(:string)
    field :json_patches, list_of(non_null(:string))
  end

  input_object :service_update_attributes do
    field :version,       :string
    field :protect,       :boolean
    field :git,           :git_ref_attributes
    field :helm,          :helm_config_attributes
    field :configuration, list_of(:config_attributes)
    field :kustomize,     :kustomize_attributes
  end

  input_object :service_clone_attributes do
    field :name,          non_null(:string)
    field :namespace,     :string
    field :configuration, list_of(:config_attributes)
  end

  input_object :git_ref_attributes do
    field :ref,    non_null(:string)
    field :folder, non_null(:string)
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
  end

  input_object :service_error_attributes do
    field :source,  non_null(:string)
    field :message, non_null(:string)
  end

  input_object :global_service_attributes do
    field :name,        non_null(:string)
    field :tags,        list_of(:tag_attributes)
    field :provider_id, :id
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
    field :git,              :git_ref,   description: "description on where in git the service's manifests should be fetched"
    field :helm,             :helm_spec, description: "description of how helm charts should be applied", resolve: fn
      %{helm: %{} = helm} = svc, _, _ ->
        {:ok, Map.put(helm, :parent, svc)}
      svc, _, _ -> {:ok, svc.helm}
    end
    field :protect,          :boolean, description: "if true, deletion of this service is not allowed"
    field :sha,              :string, description: "latest git sha we pulled from"
    field :tarball,          :string, resolve: &Deployments.tarball/3, description: "https url to fetch the latest tarball of kubernetes manifests"
    field :component_status, :string, description: "a n / m representation of the number of healthy components of this service"
    field :sync_config,      :sync_config, description: "settings for advanced tuning of the sync process"
    field :kustomize,        :kustomize, description: "kustomize related service metadata"
    field :message,          :string, description: "the commit message currently in use"
    field :deleted_at,       :datetime, description: "the time this service was scheduled for deletion"

    @desc "fetches the /docs directory within this services git tree.  This is a heavy operation and should NOT be used in list queries"
    field :docs, list_of(:git_file), resolve: &Deployments.docs/3

    field :repository, :git_repository, resolve: dataloader(Deployments), description: "the git repo of this service"

    field :helm_repository, :helm_repository, resolve: fn
      svc, _, %{context: %{loader: loader}} ->
        manual_dataloader(loader, Console.GraphQl.Resolvers.HelmRepositoryLoader, :helm, svc)
    end

    field :read_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "read policy for this service"
    field :write_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "write policy of this service"

    field :errors, list_of(:service_error), resolve: dataloader(Deployments), description: "a list of errors generated by the deployment operator"
    field :cluster,  :cluster, resolve: dataloader(Deployments), description: "the cluster this service is deployed into"
    field :revision, :revision, resolve: dataloader(Deployments), description: "the current revision of this service"
    field :configuration, list_of(:service_configuration), resolve: &Deployments.service_configuration/3, description: "possibly secret configuration used to template the manifests of this service"
    field :components, list_of(:service_component), resolve: dataloader(Deployments), description: "the kubernetes component of a service"
    field :global_service, :global_service, resolve: dataloader(Deployments), description: "the global service this service is the source for"
    field :owner, :global_service, resolve: dataloader(Deployments), description: "whether this service is controlled by a global service"

    @desc "a relay connection of all revisions of this service, these are periodically pruned up to a history limit"
    connection field :revisions, node_type: :revision do
      resolve &Deployments.list_revisions/3
    end

    field :editable, :boolean, resolve: &Deployments.editable/3, description: "whether this service is editable"

    timestamps()
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
  end

  object :object_reference do
    field :name,      :string
    field :namespace, :string
  end

  object :helm_spec do
    field :chart,        :string, description: "the name of the chart this service is using"
    field :values,       :string, description: "a helm values file to use with this service, requires auth and so is heavy to query",
      resolve: &Deployments.helm_values/3
    field :repository,   :object_reference, description: "pointer to the flux helm repository resource used for this chart"
    field :version,      :string, description: "the chart version in use currently"
    field :values_files, list_of(:string), description: "a list of relative paths to values files to use for helm applies"
  end

  @desc "a configuration item k/v pair"
  object :service_configuration do
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

    field :service, :service_deployment, resolve: dataloader(Deployments), description: "the service this component belongs to"
    field :api_deprecations, list_of(:api_deprecation), resolve: dataloader(Deployments), description: "any api deprecations discovered from this component"
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

  @desc "a rules based mechanism to redeploy a service across a fleet of clusters"
  object :global_service do
    field :id,   non_null(:id), description: "internal id of this global service"
    field :name, non_null(:string), description: "a human readable name for this global service"
    field :tags, list_of(:tag), description: "a set of tags to select clusters for this global service"

    field :service,  :service_deployment, resolve: dataloader(Deployments), description: "the service to replicate across clusters"
    field :provider, :cluster_provider, resolve: dataloader(Deployments), description: "whether to only apply to clusters with this provider"

    timestamps()
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
    field :namespace_metadata, :namespace_metadata
  end

  @desc "metadata fields for created namespaces"
  object :namespace_metadata do
    field :labels,      :map
    field :annotations, :map
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

    @desc "fetches details of this service deployment, and can be called by the deploy operator"
    field :service_deployment, :service_deployment do
      middleware Authenticated, :cluster
      arg :id,      :id
      arg :cluster, :string, description: "the handle of the cluster for this service"
      arg :name,    :string

      safe_resolve &Deployments.resolve_service/2
    end
  end

  object :public_service_mutations do
    @desc "updates only the components of a given service, to be sent after deploy operator syncs"
    field :update_service_components, :service_deployment do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)
      arg :components, list_of(:component_attributes)
      arg :errors, list_of(:service_error_attributes)

      safe_resolve &Deployments.update_service_components/2
    end
  end

  object :service_queries do
    connection field :service_deployments, node_type: :service_deployment do
      middleware Authenticated
      arg :cluster_id, :id
      arg :q,          :string
      arg :status,     :service_deployment_status
      arg :cluster,    :string, description: "the handle of the cluster for this service"

      safe_resolve &Deployments.list_services/2
    end

    field :service_statuses, list_of(:service_status_count) do
      middleware Authenticated
      arg :cluster_id, :id
      arg :q,          :string
      arg :status,     :service_deployment_status

      safe_resolve &Deployments.service_statuses/2
    end
  end

  object :service_mutations do
    field :create_service_deployment, :service_deployment do
      middleware Authenticated
      middleware Feature, :cd
      arg :cluster_id, :id
      arg :cluster,    :string, description: "the handle of the cluster for this service"
      arg :attributes, non_null(:service_deployment_attributes)

      safe_resolve &Deployments.create_service/2
    end

    field :update_service_deployment, :service_deployment do
      middleware Authenticated
      middleware Feature, :cd
      arg :id,         :id
      arg :cluster,    :string, description: "the handle of the cluster for this service"
      arg :name,       :string
      arg :attributes, non_null(:service_update_attributes)

      safe_resolve &Deployments.update_service/2
    end

    field :delete_service_deployment, :service_deployment do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_service/2
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

      safe_resolve &Deployments.rollback/2
    end

    @desc "clones the spec of the given service to be deployed either into a new namespace or new cluster"
    field :clone_service, :service_deployment do
      middleware Authenticated
      arg :service_id, :id
      arg :cluster,    :string, description: "the handle of the cluster for this service"
      arg :name,       :string
      arg :cluster_id, non_null(:id)
      arg :attributes, non_null(:service_clone_attributes)

      safe_resolve &Deployments.clone_service/2
    end

    field :self_manage, :service_deployment do
      middleware Authenticated
      arg :values, non_null(:string)

      resolve &Deployments.self_manage/2
    end

    field :create_global_service, :global_service do
      middleware Authenticated
      arg :service_id, :id
      arg :cluster,    :string, description: "the handle of the cluster for this service"
      arg :name,       :string
      arg :attributes, non_null(:global_service_attributes)

      safe_resolve &Deployments.create_global_service/2
    end

    field :delete_global_service, :global_service do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_global_service/2
    end
  end
end
