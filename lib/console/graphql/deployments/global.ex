defmodule Console.GraphQl.Deployments.Global do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Deployments

  @desc "A reference for a globalized service, which targets clusters based on the configured criteria"
  input_object :global_service_attributes do
    field :name,            non_null(:string), description: "name for this global service"
    field :tags,            list_of(:tag_attributes), description: "the cluster tags to target"
    field :distro,          :cluster_distro, description: "kubernetes distribution to target"
    field :mgmt,            :boolean, description: "whether to include management clusters in the target set"
    field :provider_id,     :id, description: "cluster api provider to target"
    field :project_id,      :id, description: "a project this global service will sync across"
    field :parent_id,       :id, description: "the id of the service creating this"
    field :reparent,        :boolean, description: "whether you want the global service to take ownership of existing plural services"
    field :template,        :service_template_attributes
    field :interval,        :string, description: "the interval at which the global service will be reconciled, default is 10m"
    field :cascade,         :cascade_attributes, description: "behavior for all owned resources when this global service is deleted"
    field :context,         :template_context_attributes, description: "additional context used to template service metadata during global service reconciliation"
    field :ignore_clusters, list_of(:id), description: "the id of the clusters to ignore"
  end

  @desc "Attributes for configuring a managed namespace"
  input_object :managed_namespace_attributes do
    field :name,         non_null(:string), description: "the name of this managed namespace (globally unique)"
    field :namespace,    :string, description: "the name of the namespace if `name` doesn't align"
    field :description,  :string, description: "A short description of the purpose of this namespace"
    field :labels,       :json, description: "labels for this namespace"
    field :annotations,  :json, description: "annotations for this namespace"
    field :pull_secrets, list_of(:string), description: "a list of pull secrets to attach to this namespace"
    field :project_id,   :id, description: "a project this managed namespace will sync across"
    field :parent_id,    :id, description: "the id of the service creating this"
    field :service,      :service_template_attributes
    field :target,       :cluster_target_attributes
    field :cascade,      :cascade_attributes, description: "behavior for all owned resources when this global service is deleted"
  end

  @desc "Attributes for configuring a service in something like a managed namespace"
  input_object :service_template_attributes do
    field :name,          :string, description: "the name for this service (optional for managed namespaces)"
    field :namespace,     :string, description: "the namespace for this service (optional for managed namespaces)"
    field :templated,     :boolean
    field :protect,       :boolean, description: "whether to protect this templated service from deletion"
    field :repository_id, :id, description: "the id of a repository to source manifests for this service"
    field :contexts,      list_of(:string), description: "a list of context names to add to this service"
    field :configuration, list_of(:config_attributes), description: "a list of secure configuration that will be added to any services created by this template"
    field :dependencies,  list_of(:service_dependency_attributes), description: "dependencies for the service to be spawned"

    field :git,         :git_ref_attributes, description: "settings to configure git for a service"
    field :helm,        :helm_config_attributes, description: "settings to configure helm for a service"
    field :kustomize,   :kustomize_attributes, description: "settings for service kustomization"
    field :sync_config, :sync_config_attributes, description: "attributes to configure sync settings for this service"
    field :sources,     list_of(:service_source_attributes), description: "a list of sources to source manifests for this service"
    field :renderers,   list_of(:renderer_attributes), description: "a list of renderers to render manifests for this service"
  end

  @desc "A spec for targeting clusters"
  input_object :cluster_target_attributes do
    field :tags,   :json, description: "the cluster tags to target"
    field :distro, :cluster_distro, description: "kubernetes distribution to target"
  end

  @desc "Whether you want to delete or detach owned resources"
  input_object :cascade_attributes do
    field :delete, :boolean
    field :detach, :boolean
  end

  @desc "Additional context used to template service metadata during global service reconciliation"
  input_object :template_context_attributes do
    field :raw, :json
  end

  @desc "a rules based mechanism to redeploy a service across a fleet of clusters"
  object :global_service do
    field :id,              non_null(:id), description: "internal id of this global service"
    field :name,            non_null(:string), description: "a human readable name for this global service"
    field :tags,            list_of(:tag), description: "a set of tags to select clusters for this global service"
    field :distro,          :cluster_distro, description: "the kubernetes distribution to target with this global service"
    field :mgmt,            :boolean, description: "whether to include management clusters in the target set"
    field :reparent,        :boolean, description: "whether you want to reparent existing plural services under this global service"
    field :cascade,         :cascade, description: "behavior for all owned resources when this global service is deleted"
    field :ignore_clusters, list_of(:id), description: "the id of the clusters to ignore"

    field :parent,   :service_deployment, resolve: dataloader(Deployments), description: "the service which created this global service"
    field :project,  :project,            resolve: dataloader(Deployments), description: "a project this global service is bound to"
    field :template, :service_template,   resolve: dataloader(Deployments), description: "the service template used to spawn services"
    field :service,  :service_deployment, resolve: dataloader(Deployments), description: "the service to replicate across clusters"
    field :provider, :cluster_provider,   resolve: dataloader(Deployments), description: "whether to only apply to clusters with this provider"

    field :context, :template_context, resolve: dataloader(Deployments), description: "additional context used to template service metadata during global service reconciliation"

    connection field :services, node_type: :service_deployment do
      arg :q, :string

      resolve &Deployments.services_for_owner/3
    end

    timestamps()
  end

  @desc "A representation of a managed namespace, which is k8s namespace configuration + a service spec to define a namespace runtime"
  object :managed_namespace do
    field :id,             non_null(:id)
    field :name,           non_null(:string), description: "the name of this namespace once its placed on a cluster"
    field :namespace,      :string, description: "override the name of the kubernetes namespace if `name` is not usable"
    field :description,    :string, description: "A short description of the purpose of this namespace"
    field :labels,         :map, description: "labels for this namespace"
    field :annotations,    :map, description: "annotations for this namespace"
    field :pull_secrets,   list_of(:string), description: "a list of pull secrets to attach to this namespace"
    field :target,         :cluster_target, description: "The targeting criteria to select clusters this namespace is bound to"
    field :deleted_at,     :datetime, description: "the timestamp this namespace was deleted at, indicating it's currently draining"
    field :cascade,        :cascade, description: "behavior for all owned resources when this global service is deleted"
    field :interval,       :string, description: "the interval at which the global service will be reconciled, default is 10m"

    field :parent,       :service_deployment,
      resolve: dataloader(Deployments),
      description: "the service which created this managed namespace"
    field :project,      :project,
      description: "a project this global service is bound to",
      resolve: dataloader(Deployments)
    field :service,      :service_template,
      description: "A template for creating the core service for this namespace",
      resolve: dataloader(Deployments)

    connection field :services, node_type: :service_deployment do
      arg :q, :string

      resolve &Deployments.services_for_namespace/3
    end

    timestamps()
  end

  @desc "Attributes for configuring a service in something like a managed namespace"
  object :service_template do
    field :name,          :string, description: "the name for this service (optional for managed namespaces)"
    field :namespace,     :string, description: "the namespace for this service (optional for managed namespaces)"
    field :templated,     :boolean
    field :repository_id, :id, description: "the id of a repository to source manifests for this service"
    field :contexts,      list_of(:string), description: "a list of context names to add to this service"

    field :repository,   :git_repository, resolve: dataloader(Deployments)
    field :dependencies, list_of(:service_dependency), resolve: dataloader(Deployments)

    field :sources,      list_of(:service_source), description: "a list of sources to source manifests for the created service"
    field :renderers,    list_of(:renderer), description: "a list of renderers to render manifests for the created service"

    field :configuration, list_of(:service_configuration),
      resolve: &Deployments.template_configuration/3,
      description: "possibly secret configuration for all spawned services, don't query this in list endpoints"

    field :git,         :git_ref, description: "settings to configure git for a service"
    field :helm,        :helm_spec, description: "settings to configure helm for a service"
    field :kustomize,   :kustomize, description: "settings for service kustomization"
    field :sync_config, :sync_config, description: "specification of how the templated service will be synced"
  end

  @desc "A spec for targeting clusters"
  object :cluster_target do
    field :tags,   :map, description: "the cluster tags to target"
    field :distro, :cluster_distro, description: "kubernetes distribution to target"
  end

  @desc "A spec for specifying cascade behavior on an owning resource"
  object :cascade do
    field :delete, :boolean, description: "whether to perform a drain-delete for all owned resources"
    field :detach, :boolean, description: "whether to perform a detach-delete for all owned resources"
  end

  @desc "Additional context used to template service metadata during global service reconciliation"
  object :template_context do
    field :raw, :map
  end

  connection node_type: :global_service
  connection node_type: :managed_namespace

  object :public_global_queries do
    connection field :cluster_managed_namespaces, node_type: :managed_namespace do
      middleware ClusterAuthenticated

      resolve &Deployments.managed_namespaces_for_cluster/2
    end

    field :managed_namespace, :managed_namespace do
      middleware Authenticated, :cluster
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.resolve_managed_namespace/2
    end
  end

  object :global_queries do
    connection field :managed_namespaces, node_type: :managed_namespace do
      middleware Authenticated
      arg :project_id, :id

      resolve &Deployments.list_managed_namespaces/2
    end

    field :global_service, :global_service do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      safe_resolve &Deployments.resolve_global/2
    end

    connection field :global_services, node_type: :global_service do
      middleware Authenticated
      arg :project_id, :id
      arg :q,          :string

      safe_resolve &Deployments.list_global_services/2
    end
  end

  object :global_mutations do
    field :create_global_service, :global_service do
      middleware Authenticated
      arg :service_id, :id
      arg :cluster,    :string, description: "the handle of the cluster for this service"
      arg :name,       :string
      arg :attributes, non_null(:global_service_attributes)

      safe_resolve &Deployments.create_global_service/2
    end

    field :update_global_service, :global_service do
      middleware Authenticated
      arg :id, non_null(:id)
      arg :attributes, non_null(:global_service_attributes)

      safe_resolve &Deployments.update_global_service/2
    end

    field :delete_global_service, :global_service do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_global_service/2
    end

    field :sync_global_service, :global_service do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.sync_global_service/2
    end

    field :create_managed_namespace, :managed_namespace do
      middleware Authenticated
      arg :attributes, non_null(:managed_namespace_attributes)

      safe_resolve &Deployments.create_managed_namespace/2
    end

    field :update_managed_namespace, :managed_namespace do
      middleware Authenticated
      arg :id, non_null(:id)
      arg :attributes, non_null(:managed_namespace_attributes)

      safe_resolve &Deployments.update_managed_namespace/2
    end

    field :delete_managed_namespace, :managed_namespace do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_managed_namespace/2
    end
  end
end
