defmodule Console.GraphQl.Deployments.Cluster do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments}

  input_object :cluster_attributes do
    field :name,           non_null(:string)
    field :provider_id,    :id
    field :version,        non_null(:string)
    field :node_pools,     list_of(:node_pool_attributes)
    field :read_bindings,  list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)
    field :tags,           list_of(:tag_attributes)
  end

  input_object :tag_attributes do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  input_object :cluster_ping do
    field :current_version, non_null(:string)
  end

  input_object :cluster_update_attributes do
    field :version,       non_null(:string)
    field :node_pools,    list_of(:node_pool_attributes)
    field :read_bindings, list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)
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
    field :aws, :aws_cloud_attributes
  end

  input_object :aws_cloud_attributes do
    field :launch_template_id, :string
  end

  input_object :cluster_provider_attributes do
    field :name,           non_null(:string)
    field :namespace,      :string
    field :cloud,          :string
    field :cloud_settings, :cloud_provider_settings_attributes
  end

  input_object :cluster_provider_update_attributes do
    field :cloud_settings, :cloud_provider_settings_attributes
  end

  input_object :cloud_provider_settings_attributes do
    field :aws, :aws_settings_attributes
    field :gcp, :gcp_settings_attributes
  end

  input_object :aws_settings_attributes do
    field :access_key_id,    non_null(:string)
    field :secret_access_key, non_null(:string)
  end

  input_object :gcp_settings_attributes do
    field :application_credentials, non_null(:string)
  end

  @desc "a CAPI provider for a cluster, cloud is inferred from name if not provided manually"
  object :cluster_provider do
    field :id,         non_null(:id), description: "the id of this provider"
    field :name,       non_null(:string), description: "a human readable name for the provider, globally unique"
    field :namespace,  non_null(:string), description: "the namespace the CAPI resources are deployed into"
    field :cloud,      non_null(:string), description: "the name of the cloud service for this provider"
    field :git,        non_null(:git_ref), description: "the details of how cluster manifests will be synced from git when created with this provider"
    field :repository, :git_repository, resolve: dataloader(Deployments), description: "the repository used to serve cluster manifests"
    field :service,    :service_deployment, resolve: dataloader(Deployments), description: "the service of the CAPI controller itself"

    field :editable,   :boolean, resolve: &Deployments.editable/3, description: "whether the current user can edit this resource"

    timestamps()
  end

  @desc "a representation of a cluster you can deploy to"
  object :cluster do
    field :id,              non_null(:id), description: "internal id of this cluster"
    field :name,            non_null(:string), description: "human readable name of this cluster, will also translate to cloud k8s name"
    field :version,         non_null(:string), description: "desired k8s version for the cluster"
    field :current_version, :string, description: "current k8s version as told to us by the deployment operator"

    field :deleted_at, :datetime, description: "when this cluster was scheduled for deletion"
    field :pinged_at,  :datetime, description: "last time the deploy operator pinged this cluster"

    field :read_bindings,  list_of(:policy_binding), resolve: dataloader(Deployments), description: "read policy for this cluster"
    field :write_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "write policy for this cluster"

    field :node_pools,  list_of(:node_pool), resolve: dataloader(Deployments), description: "list of node pool specs managed by CAPI"
    field :provider,    :cluster_provider, resolve: dataloader(Deployments), description: "the provider we use to create this cluster (null if BYOK)"
    field :service,     :service_deployment, resolve: dataloader(Deployments), description: "the service used to deploy the CAPI resources of this cluster"
    field :tags,        list_of(:tag), resolve: dataloader(Deployments), description: "key/value tags to filter clusters"
    field :api_deprecations, list_of(:api_deprecation), resolve: dataloader(Deployments), description: "all api deprecations for all services in this cluster"

    field :editable,   :boolean, resolve: &Deployments.editable/3, description: "whether the current user can edit this cluster"

    timestamps()
  end

  @desc "a specification for a node pool to be created in this cluster"
  object :node_pool do
    field :id,             non_null(:id), description: "internal id for this node pool"
    field :name,           non_null(:string), description: "name of this node pool (must be unique)"
    field :min_size,       non_null(:integer), description: "minimum number of instances in this node pool"
    field :max_size,       non_null(:integer), description: "maximum number of instances in this node pool"
    field :instance_type,  non_null(:string), description: "the type of node to use (usually cloud-specific)"
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

  object :tag do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  connection node_type: :cluster
  connection node_type: :cluster_provider

  delta :cluster
  delta :cluster_provider

  object :public_cluster_mutations do
    @desc "a regular status ping to be sent by the deploy operator"
    field :ping_cluster, :cluster do
      middleware ClusterAuthenticated
      arg :attributes, non_null(:cluster_ping)

      safe_resolve &Deployments.ping/2
    end
  end

  object :cluster_queries do
    @desc "a relay connection of all clusters visible to the current user"
    connection field :clusters, node_type: :cluster do
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

      resolve &Deployments.resolve_cluster/2
    end

    @desc "fetches an individual cluster provider"
    field :cluster_provider, :cluster_provider do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_provider/2
    end
  end

  object :cluster_mutations do
    field :create_cluster, :cluster do
      middleware Authenticated
      arg :attributes, non_null(:cluster_attributes)

      safe_resolve &Deployments.create_cluster/2
    end

    field :update_cluster, :cluster do
      middleware Authenticated
      arg :id, non_null(:id)
      arg :attributes, non_null(:cluster_update_attributes)

      safe_resolve &Deployments.update_cluster/2
    end

    field :delete_cluster, :cluster do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_cluster/2
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
  end
end
