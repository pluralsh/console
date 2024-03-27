defmodule Console.GraphQl.Deployments.Global do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Deployments

  @desc "A reference for a globalized service, which targets clusters based on the configured criteria"
  input_object :global_service_attributes do
    field :name,        non_null(:string), description: "name for this global service"
    field :tags,        list_of(:tag_attributes), description: "the cluster tags to target"
    field :distro,      :cluster_distro, description: "kubernetes distribution to target"
    field :provider_id, :id, description: "cluster api provider to target"
  end

  @desc "Attributes for configuring a managed namespace"
  input_object :managed_namespace_attributes do
    field :name,         non_null(:string), description: "the name of this namespace once its placed on a cluster"
    field :description,  :string, description: "A short description of the purpose of this namespace"
    field :labels,       :json, description: "labels for this namespace"
    field :annotations,  :json, description: "annotations for this namespace"
    field :pull_secrets, list_of(:string), description: "a list of pull secrets to attach to this namespace"
    field :service,      :service_template_attributes
    field :target,       :cluster_target_attributes
  end

  @desc "Attributes for configuring a service in something like a managed namespace"
  input_object :service_template_attributes do
    field :name,          :string, description: "the name for this service (optional for managed namespaces)"
    field :namespace,     :string, description: "the namespace for this service (optional for managed namespaces)"
    field :templated,     :boolean
    field :repository_id, :id, description: "the id of a repository to source manifests for this service"
    field :contexts,      list_of(:id), description: "a list of context ids to add to this service"

    field :git,         :git_ref_attributes, description: "settings to configure git for a service"
    field :helm,        :helm_config_attributes, description: "settings to configure helm for a service"
    field :kustomize,   :kustomize_attributes, description: "settings for service kustomization"
    field :sync_config, :sync_config_attributes, description: "attributes to configure sync settings for this service"
  end

  @desc "A spec for targeting clusters"
  input_object :cluster_target_attributes do
    field :tags,   :json, description: "the cluster tags to target"
    field :distro, :cluster_distro, description: "kubernetes distribution to target"
  end

  @desc "a rules based mechanism to redeploy a service across a fleet of clusters"
  object :global_service do
    field :id,     non_null(:id), description: "internal id of this global service"
    field :name,   non_null(:string), description: "a human readable name for this global service"
    field :tags,   list_of(:tag), description: "a set of tags to select clusters for this global service"
    field :distro, :cluster_distro, description: "the kubernetes distribution to target with this global service"

    field :service,  :service_deployment, resolve: dataloader(Deployments), description: "the service to replicate across clusters"
    field :provider, :cluster_provider,   resolve: dataloader(Deployments), description: "whether to only apply to clusters with this provider"

    connection field :services, node_type: :service_deployment do
      arg :q, :string

      resolve &Deployments.services_for_owner/3
    end

    timestamps()
  end

  @desc "A representation of a managed namespace, which is k8s namespace configuration + a service spec to define a namespace runtime"
  object :managed_namespace do
    field :id,           non_null(:id)
    field :name,         non_null(:string), description: "the name of this namespace once its placed on a cluster"
    field :description,  :string, description: "A short description of the purpose of this namespace"
    field :labels,       :map, description: "labels for this namespace"
    field :annotations,  :map, description: "annotations for this namespace"
    field :pull_secrets, list_of(:string), description: "a list of pull secrets to attach to this namespace"
    field :target,       :cluster_target, description: "The targeting criteria to select clusters this namespace is bound to"
    field :deleted_at,   :datetime, description: "the timestamp this namespace was deleted at, indicating it's currently draining"
    field :service,      :service_template,
      description: "A template for creating the core service for this namespace",
      resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "Attributes for configuring a service in something like a managed namespace"
  object :service_template do
    field :name,          :string, description: "the name for this service (optional for managed namespaces)"
    field :namespace,     :string, description: "the namespace for this service (optional for managed namespaces)"
    field :templated,     :boolean
    field :repository_id, :id, description: "the id of a repository to source manifests for this service"
    field :contexts,      list_of(:id), description: "a list of context ids to add to this service"

    field :git,         :git_ref, description: "settings to configure git for a service"
    field :helm,        :helm_spec, description: "settings to configure helm for a service"
    field :kustomize,   :kustomize, description: "settings for service kustomization"
    field :sync_config, :sync_config, description: "specification of how the templated service will be synced"
  end

  @desc "A spec for targeting clusters"
  object :cluster_target do
    field :tags,   :json, description: "the cluster tags to target"
    field :distro, :cluster_distro, description: "kubernetes distribution to target"
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
      arg :id, non_null(:id)

      resolve &Deployments.resolve_managed_namespace/2
    end
  end

  object :global_queries do
    connection field :managed_namespaces, node_type: :managed_namespace do
      middleware Authenticated

      resolve &Deployments.list_managed_namespaces/2
    end

    field :global_service, :global_service do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.resolve_global/2
    end

    connection field :global_services, node_type: :global_service do
      middleware Authenticated

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
