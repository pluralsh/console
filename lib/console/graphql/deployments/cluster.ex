defmodule Console.GraphQl.Deployments.Cluster do
  use Console.GraphQl.Schema.Base
  alias Console.Schema.ClusterProvider
  alias Console.Deployments.Compatibilities
  alias Console.GraphQl.Resolvers.{Deployments}

  input_object :cluster_attributes do
    field :name,           non_null(:string)
    field :handle,         :string, description: "a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name"
    field :provider_id,    :id
    field :credential_id,  :id, description: "a cloud credential to use when provisioning this cluster"
    field :version,        :string
    field :protect,        :boolean
    field :kubeconfig,     :kubeconfig_attributes
    field :cloud_settings, :cloud_settings_attributes
    field :node_pools,     list_of(:node_pool_attributes)
    field :read_bindings,  list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)
    field :tags,           list_of(:tag_attributes)
  end

  input_object :kubeconfig_attributes do
    field :raw, :string
  end

  input_object :tag_attributes do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  input_object :cluster_ping do
    field :current_version, non_null(:string)
  end

  input_object :cluster_update_attributes do
    field :version,    :string
    field :handle,     :string, description: "a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name"
    field :service,    :cluster_service_attributes, description: "if you optionally want to reconfigure the git repository for the cluster service"
    field :kubeconfig, :kubeconfig_attributes
    field :protect,    :boolean
    field :node_pools, list_of(:node_pool_attributes)
  end

  input_object :cluster_service_attributes do
    field :id,            non_null(:id)
    field :repository_id, :id
    field :git,           non_null(:git_ref_attributes)
  end

  input_object :node_pool_attributes do
    field :name,           non_null(:string)
    field :min_size,       non_null(:integer)
    field :max_size,       non_null(:integer)
    field :instance_type,  non_null(:string)
    field :labels,         :map
    field :taints,         list_of(:taint_attributes)
    field :cloud_settings, :cloud_settings_attributes
  end

  input_object :taint_attributes do
    field :key,    non_null(:string)
    field :value,  non_null(:string)
    field :effect, non_null(:string)
  end

  input_object :cloud_settings_attributes do
    field :aws,   :aws_cloud_attributes
    field :gcp,   :gcp_cloud_attributes
    field :azure, :azure_cloud_attributes
  end

  input_object :aws_cloud_attributes do
    field :region, :string
  end

  input_object :gcp_cloud_attributes do
    field :project, :string
    field :network, :string
    field :region,  :string
  end

  input_object :azure_cloud_attributes do
    field :location,        :string
    field :subscription_id, :string
    field :resource_group,  :string
    field :network,         :string
  end

  input_object :cluster_provider_attributes do
    field :name,           non_null(:string)
    field :namespace,      :string
    field :cloud,          :string
    field :cloud_settings, :cloud_provider_settings_attributes
  end

  input_object :cluster_provider_update_attributes do
    field :service,        :cluster_service_attributes, description: "if you optionally want to reconfigure the git repository for the cluster provider"
    field :cloud_settings, :cloud_provider_settings_attributes
  end

  input_object :cloud_provider_settings_attributes do
    field :aws,   :aws_settings_attributes
    field :gcp,   :gcp_settings_attributes
    field :azure, :azure_settings_attributes
  end

  input_object :provider_credential_attributes do
    field :namespace, :string
    field :name,      non_null(:string)
    field :kind,      :string
  end

  input_object :aws_settings_attributes do
    field :access_key_id,    non_null(:string)
    field :secret_access_key, non_null(:string)
  end

  input_object :gcp_settings_attributes do
    field :application_credentials, non_null(:string)
  end

  input_object :azure_settings_attributes do
    field :tenant_id,       non_null(:string)
    field :subscription_id, non_null(:string)
    field :client_id,       non_null(:id)
    field :client_secret,   non_null(:string)
  end

  input_object :runtime_service_attributes do
    field :name,    non_null(:string)
    field :version, non_null(:string)
  end

  @desc "a CAPI provider for a cluster, cloud is inferred from name if not provided manually"
  object :cluster_provider do
    field :id,                  non_null(:id), description: "the id of this provider"
    field :name,                non_null(:string), description: "a human readable name for the provider, globally unique"
    field :namespace,           non_null(:string), description: "the namespace the CAPI resources are deployed into"
    field :cloud,               non_null(:string), description: "the name of the cloud service for this provider"
    field :git,                 non_null(:git_ref), description: "the details of how cluster manifests will be synced from git when created with this provider"
    field :repository,          :git_repository, resolve: dataloader(Deployments), description: "the repository used to serve cluster manifests"
    field :provider_repository, :git_repository, resolve: dataloader(Deployments), description: "the repository for the CAPI service itself if customized"
    field :service,             :service_deployment, resolve: dataloader(Deployments), description: "the service of the CAPI controller itself"
    field :credentials,         list_of(:provider_credential), resolve: dataloader(Deployments), description: "a list of credentials eligible for this provider"
    field :deleted_at,          :datetime, description: "when the cluster provider was deleted"

    field :runtime_services, list_of(:runtime_service) do
      arg :kube_version, :string, description: "the kubernetes version you want to check is upgradeable"
      resolve &Deployments.runtime_services/3
    end

    field :supported_versions, list_of(:string), description: "the kubernetes versions this provider currently supports",
      resolve: fn provider, _, _ -> {:ok, ClusterProvider.supported_versions(provider)} end

    field :regions, list_of(:string), description: "the region names this provider can deploy to",
      resolve: fn provider, _, _ -> {:ok, ClusterProvider.regions(provider)} end

    field :editable, :boolean, resolve: &Deployments.editable/3, description: "whether the current user can edit this resource"

    timestamps()
  end

  @desc "a representation of a cluster you can deploy to"
  object :cluster do
    field :id,              non_null(:id), description: "internal id of this cluster"
    field :self,            :boolean, description: "whether this is the management cluster itself"
    field :name,            non_null(:string), description: "human readable name of this cluster, will also translate to cloud k8s name"
    field :protect,         :boolean, description: "if true, this cluster cannot be deleted"
    field :version,         :string, description: "desired k8s version for the cluster"
    field :current_version, :string, description: "current k8s version as told to us by the deployment operator"
    field :handle,          :string, description: "a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name"
    field :installed,       :boolean, description: "whether the deploy operator has been registered for this cluster"

    field :kas_url, :string, description: "the url of the kas server you can access this cluster from", resolve: fn
      _, _, _ -> {:ok, Console.Deployments.Clusters.kas_proxy_url()}
    end

    field :deploy_token, :string,
      description: "a auth token to be used by the deploy operator, only readable on create",
      resolve: &Deployments.deploy_token/3

    field :deleted_at, :datetime, description: "when this cluster was scheduled for deletion"
    field :pinged_at,  :datetime, description: "last time the deploy operator pinged this cluster"

    field :read_bindings,  list_of(:policy_binding), resolve: dataloader(Deployments), description: "read policy for this cluster"
    field :write_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "write policy for this cluster"

    field :node_pools,       list_of(:node_pool), resolve: dataloader(Deployments), description: "list of node pool specs managed by CAPI"
    field :provider,         :cluster_provider, resolve: dataloader(Deployments), description: "the provider we use to create this cluster (null if BYOK)"
    field :credential,       :provider_credential, resolve: dataloader(Deployments), description: "a custom credential to use when provisioning this cluster"
    field :service,          :service_deployment, resolve: dataloader(Deployments), description: "the service used to deploy the CAPI resources of this cluster"
    field :tags,             list_of(:tag), resolve: dataloader(Deployments), description: "key/value tags to filter clusters"
    field :api_deprecations, list_of(:api_deprecation), resolve: dataloader(Deployments), description: "all api deprecations for all services in this cluster"
    field :service_errors,   list_of(:service_error), resolve: dataloader(Deployments), description: "any errors which might have occurred during the bootstrap process"
    field :repository,       :git_repository, resolve: dataloader(Deployments), description: "a custom git repository if you want to define your own CAPI manifests"

    field :nodes, list_of(:node), description: "list cached nodes for a cluster, this can be stale up to 5m",
      resolve: &Deployments.list_nodes/3
    field :node_metrics, list_of(:node_metric), description: "list the cached node metrics for a cluster, can also be stale up to 5m",
      resolve: &Deployments.list_node_metrics/3

    field :status, :cluster_status,
      description: "the status of the cluster as seen from the CAPI operator, since some clusters can be provisioned without CAPI, this can be null",
      resolve: &Deployments.resolve_cluster_status/3

    @desc "a relay connection of all revisions of this service, these are periodically pruned up to a history limit"
    connection field :revisions, node_type: :revision do
      resolve &Deployments.list_cluster_revisions/3
    end

    @desc "fetches a list of runtime services found in this cluster, this is an expensive operation that should not be done in list queries"
    field :runtime_services, list_of(:runtime_service), resolve: &Deployments.runtime_services/3

    field :editable, :boolean, resolve: &Deployments.editable/3, description: "whether the current user can edit this cluster"

    timestamps()
  end

  @desc "a historical revision of a cluster, including version, cloud and node group configuration"
  object :cluster_revision do
    field :id,         non_null(:id)
    field :version,    :string
    field :node_pools, list_of(:node_pool)

    timestamps()
  end

  @desc "a specification for a node pool to be created in this cluster"
  object :node_pool do
    field :id,             non_null(:id), description: "internal id for this node pool"
    field :name,           non_null(:string), description: "name of this node pool (must be unique)"
    field :min_size,       non_null(:integer), description: "minimum number of instances in this node pool"
    field :max_size,       non_null(:integer), description: "maximum number of instances in this node pool"
    field :instance_type,  non_null(:string), description: "the type of node to use (usually cloud-specific)"
    field :spot,           :boolean, description: "whether this is a spot pool or not"
    field :labels,         :map, description: "kubernetes labels to apply to the nodes in this pool, useful for node selectors"
    field :taints,         list_of(:taint), description: "any taints you'd want to apply to a node, for eg preventing scheduling on spot instances"
    field :cloud_settings, :cloud_settings, description: "cloud specific settings for the node groups"

    timestamps()
  end

  @desc "a kubernetes node taint"
  object :taint do
    field :key,    non_null(:string)
    field :value,  non_null(:string)
    field :effect, non_null(:string)
  end

  @desc "cloud specific settings for a node pool"
  object :cloud_settings do
    field :aws, :aws_cloud
  end

  @desc "aws node customizations"
  object :aws_cloud do
    field :launch_template_id, :string, description: "custom launch template for your nodes, useful for Golden AMI setups"
  end

  @desc "a cloud credential that can be used while creating new clusters"
  object :provider_credential do
    field :id,        non_null(:id)
    field :name,      non_null(:string)
    field :namespace, non_null(:string)
    field :kind,      non_null(:string)

    timestamps()
  end

  @desc "the crd status of the cluster as seen by the CAPI operator"
  object :cluster_status do
    field :phase,               :string
    field :control_plane_ready, :boolean
    field :failure_message,     :string
    field :failure_reason,      :string
    field :conditions,          list_of(:cluster_condition)
  end

  @desc "a single condition struct for various phases of the cluster provisionining process"
  object :cluster_condition do
    field :last_transition_time, :string
    field :status,               :string
    field :type,                 :string
    field :message,              :string
    field :reason,               :string
    field :severity,             :string
  end

  @desc "A common kubernetes cluster add-on like cert-manager, istio, etc"
  object :cluster_add_on do
    field :name,          :string
    field :version,       :string
    field :icon,          :string
    field :global,        :boolean
    field :configuration, list_of(:add_on_configuration)
  end

  @desc "Input configuration for an add-on you can install"
  object :add_on_configuration do
    field :name,          :string, description: "name for this configuration"
    field :documentation, :string, description: "a docstring explaining this configuration"
    field :type,          :string, description: "a type for the configuration (should eventually be coerced back to string)"
    field :values,        list_of(:string), description: "the values for ENUM type conditions"
    field :condition,     :add_on_config_condition
  end

  @desc "a condition that determines whether its configuration is viewable"
  object :add_on_config_condition do
    field :operation, :string, description: "the operation for this condition, eg EQ, LT, GT"
    field :field,     :string, description: "the field this condition applies to"
    field :value,     :string, description: "the value to apply the condition with, for binary operators like LT/GT"
  end

  @desc "a service encapsulating a controller like istio/ingress-nginx/etc that is meant to extend the kubernetes api"
  object :runtime_service do
    field :id,            non_null(:id)
    field :name,          non_null(:string), description: "add-on name"
    field :version,       non_null(:string), description: "add-on version, should be semver formatted"
    field :addon,         :runtime_addon,    description: "the full specification of this kubernetes add-on"
    field :addon_version, :addon_version,    description: "the version of the add-on you've currently deployed"
    field :service,       :service_deployment,
      resolve: dataloader(Deployments),
      description: "the plural service it came from"

    timestamps()
  end

  @desc "a full specification of a kubernetes runtime component's requirements"
  object :runtime_addon do
    field :icon,     :string, description: "an icon to identify this runtime add-on"
    field :versions, list_of(:addon_version)
  end

  @desc "the specification of a runtime service at a specific version"
  object :addon_version do
    field :version,           :string, description: "add-on version, semver formatted"
    field :kube,              list_of(:string), description: "kubernetes versions this add-on works with"
    field :requirements,      list_of(:version_reference), description: "any other add-ons this might require"
    field :incompatibilities, list_of(:version_reference), description: "any add-ons this might break"

    @desc "checks if this is blocking a specific kubernetes upgrade"
    field :blocking, :boolean do
      arg :kube_version, non_null(:string)
      resolve fn vsn, %{kube_version: kube}, _ -> {:ok, Compatibilities.Version.blocking?(vsn, kube)} end
    end
  end

  @desc "a shortform reference to an addon by version"
  object :version_reference do
    field :name,    non_null(:string)
    field :version, non_null(:string)
  end

  object :tag do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  connection node_type: :cluster
  connection node_type: :cluster_provider
  connection node_type: :cluster_revision

  delta :cluster
  delta :cluster_provider

  object :public_cluster_mutations do
    @desc "a regular status ping to be sent by the deploy operator"
    field :ping_cluster, :cluster do
      middleware ClusterAuthenticated
      arg :attributes, non_null(:cluster_ping)

      safe_resolve &Deployments.ping/2
    end

    @desc "registers a list of runtime services discovered for the current cluster"
    field :register_runtime_services, :integer do
      middleware ClusterAuthenticated
      arg :services,   list_of(:runtime_service_attributes)
      arg :service_id, :id

      resolve &Deployments.create_runtime_services/2
    end
  end

  object :public_cluster_queries do
    @desc "tells you what cluster a deploy token points to"
    field :my_cluster, :cluster do
      middleware ClusterAuthenticated

      safe_resolve &Deployments.my_cluster/2
    end
  end

  object :cluster_queries do
    @desc "exchanges a kubeconfig token for user info"
    field :token_exchange, :user do
      arg :token, non_null(:string)

      resolve &Deployments.token_exchange/2
    end

    @desc "a relay connection of all clusters visible to the current user"
    connection field :clusters, node_type: :cluster do
      arg :q, :string
      middleware Authenticated

      resolve &Deployments.list_clusters/2
    end

    @desc "a relay connection of all providers visible to the current user"
    connection field :cluster_providers, node_type: :cluster_provider do
      middleware Authenticated

      resolve &Deployments.list_providers/2
    end

    @desc "fetches an individual cluster"
    field :cluster, :cluster do
      middleware Authenticated, :cluster
      arg :id, :id
      arg :handle, :string

      safe_resolve &Deployments.resolve_cluster/2
    end

    @desc "fetches an individual cluster provider"
    field :cluster_provider, :cluster_provider do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_provider/2
    end

    @desc "list all addons currently resident in the artifacts repo"
    field :cluster_add_ons, list_of(:cluster_add_on) do
      middleware Authenticated

      resolve &Deployments.list_addons/2
    end
  end

  object :cluster_mutations do
    field :create_cluster, :cluster do
      middleware Authenticated
      middleware Feature, :cd
      arg :attributes, non_null(:cluster_attributes)

      safe_resolve &Deployments.create_cluster/2
    end

    field :update_cluster, :cluster do
      middleware Authenticated
      middleware Feature, :cd
      arg :id, non_null(:id)
      arg :attributes, non_null(:cluster_update_attributes)

      safe_resolve &Deployments.update_cluster/2
    end

    field :delete_cluster, :cluster do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_cluster/2
    end

    @desc "soft deletes a cluster, by deregistering it in our system but not disturbing any kubernetes objects"
    field :detach_cluster, :cluster do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.detach_cluster/2
    end

    field :create_cluster_provider, :cluster_provider do
      middleware Authenticated
      arg :attributes, non_null(:cluster_provider_attributes)

      safe_resolve &Deployments.create_provider/2
    end

    field :update_cluster_provider, :cluster_provider do
      middleware Authenticated
      arg :id, non_null(:id)
      arg :attributes, non_null(:cluster_provider_update_attributes)

      safe_resolve &Deployments.update_provider/2
    end

    field :delete_cluster_provider, :cluster_provider do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_provider/2
    end

    field :create_provider_credential, :provider_credential do
      middleware Authenticated
      arg :attributes, non_null(:provider_credential_attributes)
      arg :name,       non_null(:string)

      safe_resolve &Deployments.create_provider_credential/2
    end

    field :delete_provider_credential, :provider_credential do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_provider_credential/2
    end

    field :install_add_on, :service_deployment do
      middleware Authenticated
      arg :name,          non_null(:string)
      arg :configuration, list_of(:config_attributes)
      arg :cluster_id,    non_null(:id)
      arg :global,        :global_service_attributes

      resolve &Deployments.install_addon/2
    end
  end
end
