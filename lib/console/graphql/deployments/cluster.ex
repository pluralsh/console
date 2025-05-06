defmodule Console.GraphQl.Deployments.Cluster do
  use Console.GraphQl.Schema.Base
  alias Console.Schema.{ClusterProvider, Cluster}
  alias Console.Deployments.{Compatibilities, Clusters}
  alias Console.GraphQl.Resolvers.{Deployments, User}

  ecto_enum :cluster_distro, Cluster.Distro
  ecto_enum :upgrade_insight_status, Console.Schema.UpgradeInsight.Status
  ecto_enum :scaling_recommendation_type, Console.Schema.ClusterScalingRecommendation.Type
  ecto_enum :service_mesh, Console.Schema.OperationalLayout.ServiceMesh

  enum :conjunction do
    value :and
    value :or
  end

  enum :tag_type do
    value :cluster
    value :stack
  end

  enum :heat_map_flavor do
    value :pod
    value :namespace
    value :node
  end

  input_object :cluster_attributes do
    field :name,           non_null(:string)
    field :handle,         :string, description: "a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name"
    field :provider_id,    :id
    field :credential_id,  :id, description: "a cloud credential to use when provisioning this cluster"
    field :version,        :string
    field :distro,         :cluster_distro
    field :metadata,       :json
    field :protect,        :boolean
    field :kubeconfig,     :kubeconfig_attributes
    field :cloud_settings, :cloud_settings_attributes
    field :project_id,     :id, description: "the project id this cluster will belong to"
    field :upgrade_plan,   :upgrade_plan_attributes, description: "status of the upgrade plan for this cluster"
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
    field :current_version,    non_null(:string)
    field :kubelet_version,    :string
    field :distro,             :cluster_distro
    field :insight_components, list_of(:cluster_insight_component_attributes),
      description: "scraped k8s objects to use for cluster insights, don't send at all if not w/in the last scrape interval"
  end

  input_object :cluster_insight_component_attributes do
    field :group,     :string
    field :version,   non_null(:string)
    field :kind,      non_null(:string)
    field :namespace, :string
    field :name,      non_null(:string)
  end

  input_object :cluster_update_attributes do
    field :name,         :string
    field :version,      :string
    field :handle,       :string, description: "a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name"
    field :service,      :cluster_service_attributes, description: "if you optionally want to reconfigure the git repository for the cluster service"
    field :kubeconfig,   :kubeconfig_attributes, description: "pass a kubeconfig for this cluster (DEPRECATED)"
    field :upgrade_plan, :upgrade_plan_attributes, description: "status of the upgrade plan for this cluster"
    field :protect,      :boolean
    field :distro,       :cluster_distro
    field :metadata,     :json
    field :node_pools,   list_of(:node_pool_attributes)
    field :tags,         list_of(:tag_attributes)
    field :read_bindings,  list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)
  end

  input_object :cluster_service_attributes do
    field :id,            non_null(:id)
    field :repository_id, :id
    field :git,           non_null(:git_ref_attributes)
  end

  input_object :upgrade_plan_attributes do
    field :compatibilities,   :boolean, description: "whether all compatibilities for a cluster upgrade have been cleared"
    field :incompatibilities, :boolean, description: "whether all incompatibilities w/in runtime components have been cleared"
    field :deprecations,      :boolean, description: "whether all deprecated apis for a cluster have been cleared"
  end

  input_object :node_pool_attributes do
    field :name,           non_null(:string)
    field :min_size,       non_null(:integer)
    field :max_size,       non_null(:integer)
    field :instance_type,  non_null(:string)
    field :labels,         :json
    field :taints,         list_of(:taint_attributes)
    field :cloud_settings, :node_pool_cloud_attributes
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

  input_object :node_pool_cloud_attributes do
    field :aws, :aws_node_cloud_attributes
  end

  input_object :aws_node_cloud_attributes do
    field :launch_template_id, :string
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
    field :name,           non_null(:string)
    field :version,        non_null(:string)
    field :instance_count, :integer, description: "the number of instances of this service we've found"
  end

  input_object :deprecated_custom_resource_attributes do
    field :group,        non_null(:string)
    field :version,      non_null(:string)
    field :kind,         non_null(:string)
    field :namespace,    :string
    field :name,         non_null(:string)
    field :next_version, non_null(:string), description: "the next valid version for this resource"
  end

  input_object :agent_migration_attributes do
    field :name,          :string
    field :ref,           :string
    field :configuration, :json
  end

  input_object :pinned_custom_resource_attributes do
    field :name,         non_null(:string)
    field :display_name, non_null(:string)
    field :group,        non_null(:string)
    field :version,      non_null(:string)
    field :kind,         non_null(:string)
    field :namespaced,   :boolean
    field :cluster_id,   :id
  end

  input_object :tag_input do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  input_object :tag_query do
    field :op,   non_null(:conjunction)
    field :tags, list_of(:tag_input)
  end

  input_object :upgrade_insight_attributes do
    field :name,            non_null(:string)
    field :version,         :string, description: "the k8s version this insight applies to"
    field :description,     :string, description: "longform description of this insight"
    field :status,          :upgrade_insight_status
    field :refreshed_at,    :datetime
    field :transitioned_at, :datetime

    field :details, list_of(:upgrade_insight_detail_attributes)
  end

  input_object :cloud_addon_attributes do
    field :distro,  :cluster_distro
    field :name,    :string
    field :version, :string
  end

  input_object :upgrade_insight_detail_attributes do
    field :status,      :upgrade_insight_status
    field :used,        :string, description: "a possibly deprecated API"
    field :replacement, :string, description: "the replacement for this API"
    field :client_info, list_of(:insight_client_info_attributes), description: "descriptions of the HTTP clients triggering this insight"

    field :replaced_in, :string
    field :removed_in,  :string

    field :last_used_at, :datetime, description: "the latest timestamp this insight has been observed"
  end

  input_object :insight_client_info_attributes do
    field :user_agent,      :string
    field :count,           :string
    field :last_request_at, :datetime
  end

  input_object :cost_ingest_attributes do
    field :cluster,         :cost_attributes
    field :namespaces,      list_of(:cost_attributes)
    field :recommendations, list_of(:cluster_recommendation_attributes)
  end

  input_object :cost_attributes do
    field :namespace,          :string, description: "leave null if cluster scoped"
    field :memory,             :float
    field :cpu,                :float
    field :gpu,                :float
    field :storage,            :float
    field :memory_util,        :float, description: "the historical memory utilization for this scope"
    field :cpu_util,           :float, description: "the historical cpu utilization for this scope"
    field :gpu_util,           :float, description: "the historical gpu utilization for this scope"
    field :cpu_cost,           :float, description: "the historical cpu cost for this scope"
    field :memory_cost,        :float, description: "the historical memory cost for this scope"
    field :gpu_cost,           :float, description: "the historical gpu cost for this scope"
    field :ingress_cost,       :float
    field :load_balancer_cost, :float
    field :egress_cost,        :float
    field :node_cost,          :float
    field :control_plane_cost, :float
    field :storage_cost,       :float
  end

  input_object :cluster_recommendation_attributes do
    field :type,           :scaling_recommendation_type
    field :namespace,      :string
    field :name,           :string
    field :container,      :string

    field :cpu_util,       :float, description: "the historical cpu utilization for this scope"
    field :gpu_util,       :float, description: "the historical gpu utilization for this scope"
    field :memory_util,    :float, description: "the historical memory utilization for this scope"

    field :memory_request, :float
    field :cpu_request,    :float

    field :cpu_cost,       :float
    field :memory_cost,    :float
    field :gpu_cost,       :float

    field :service_id, :id, description: "the service id known to be attached to this recommendation"
  end

  input_object :cluster_audit_attributes do
    field :cluster_id,    non_null(:id),     description: "the cluster this request was made on"
    field :method,        non_null(:string), description: "the http method from the given request"
    field :path,          non_null(:string), description: "the path made for the given request"
    field :response_code, :integer
  end

  input_object :cluster_registration_create_attributes do
    field :machine_id, non_null(:string), description: "a unique machine id for the created cluster"
    field :project_id, :id, description: "the project this cluster will live in (can be inferred from bootstrap token)"
  end

  input_object :cluster_registration_update_attributes do
    field :name,     non_null(:string), description: "the name to give to the cluster"
    field :handle,   :string, description: "the handle to apply to the cluster"
    field :tags,     list_of(:tag_input), description: "the tags to apply to the given cluster"
    field :metadata, :json, description: "additional metadata to apply to the cluster"
  end

  input_object :cluster_iso_image_attributes do
    field :image,    non_null(:string), description: "the image this iso was pushed to"
    field :registry, non_null(:string), description: "the registry holding the image"
    field :user,     :string, description: "ssh username for the new device"
    field :password, :string, description: "ssh password for the new device"
    field :project_id, :id, description: "the project this cluster will live in (can be inferred from bootstrap token)"
  end

  input_object :operational_layout_attributes do
    field :service_mesh, :service_mesh
    field :namespaces,   :cluster_namespaces_attributes
  end

  input_object :cluster_namespaces_attributes do
    field :external_dns,   list_of(:string)
    field :cert_manager,   :string
    field :istio,          :string
    field :linkerd,        :string
    field :cilium,         :string
    field :ebs_csi_driver, :string
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

  object :cluster_metrics do
    field :cpu, list_of(:metric_response)
    field :memory, list_of(:metric_response)
    field :cpu_requests, list_of(:metric_response)
    field :memory_requests, list_of(:metric_response)
    field :cpu_limits, list_of(:metric_response)
    field :memory_limits, list_of(:metric_response)
    field :pods, list_of(:metric_response)
    field :cpu_usage, list_of(:metric_response)
    field :memory_usage, list_of(:metric_response)
  end

  object :cluster_node_metrics do
    field :cpu, list_of(:metric_response)
    field :memory, list_of(:metric_response)
    field :cpu_usage, list_of(:metric_response)
    field :memory_usage, list_of(:metric_response)
  end

  @desc "a representation of a cluster you can deploy to"
  object :cluster do
    field :id,                non_null(:id), description: "internal id of this cluster"
    field :self,              :boolean, description: "whether this is the management cluster itself"
    field :name,              non_null(:string), description: "human readable name of this cluster, will also translate to cloud k8s name"
    field :protect,           :boolean, description: "if true, this cluster cannot be deleted"
    field :virtual,           :boolean, description: "whether this is actually a virtual cluster"
    field :version,           :string, description: "desired k8s version for the cluster"
    field :distro,            :cluster_distro, description: "the distribution of kubernetes this cluster is running"
    field :metadata,          :map, description: "arbitrary json metadata to store user-specific state of this cluster (eg IAM roles for add-ons)"
    field :current_version,   :string, description: "current k8s version as told to us by the deployment operator"
    field :kubelet_version,   :string, description: "The lowest discovered kubelet version for all nodes in the cluster"
    field :handle,            :string, description: "a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name"
    field :installed,         :boolean, description: "whether the deploy operator has been registered for this cluster"
    field :settings,          :cloud_settings, description: "the cloud settings for this cluster (for instance its aws region)"
    field :upgrade_plan,      :cluster_upgrade_plan, description: "Checklist of tasks to complete to safely upgrade this cluster"
    field :agent_helm_values, :string, description: "The helm values for the agent installation",
      resolve: &Deployments.agent_helm_values_for_cluster/3


    field :healthy, :boolean, description: "Whether this cluster was recently pinged", resolve: fn
      cluster, _, _ -> {:ok, Cluster.healthy?(cluster)}
    end

    field :kas_url, :string, description: "the url of the kas server you can access this cluster from", resolve: fn
      _, _, _ -> {:ok, Console.Deployments.Clusters.kas_proxy_url()}
    end

    field :agent_url, :string,
      description: "the url this clusters deployment operator will use for gql requests",
      resolve: fn _, _, _ -> {:ok, Console.Deployments.Services.api_url("gql")} end

    field :deploy_token, :string,
      description: "a auth token to be used by the deploy operator, only readable on create",
      resolve: &Deployments.deploy_token/3

    field :deleted_at, :datetime, description: "when this cluster was scheduled for deletion"
    field :pinged_at,  :datetime, description: "last time the deploy operator pinged this cluster"

    field :read_bindings,  list_of(:policy_binding), resolve: dataloader(Deployments), description: "read policy for this cluster"
    field :write_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "write policy for this cluster"

    field :project,          :project, resolve: dataloader(Deployments), description: "the project this cluster belongs to"
    field :node_pools,       list_of(:node_pool), resolve: dataloader(Deployments), description: "list of node pool specs managed by CAPI"
    field :provider,         :cluster_provider, resolve: dataloader(Deployments), description: "the provider we use to create this cluster (null if BYOK)"
    field :credential,       :provider_credential, resolve: dataloader(Deployments), description: "a custom credential to use when provisioning this cluster"
    field :service,          :service_deployment, resolve: dataloader(Deployments), description: "the service used to deploy the CAPI resources of this cluster"
    field :tags,             list_of(:tag), resolve: dataloader(Deployments), description: "key/value tags to filter clusters"
    field :api_deprecations, list_of(:api_deprecation), resolve: dataloader(Deployments), description: "all api deprecations for all services in this cluster"
    field :service_errors,   list_of(:service_error), resolve: dataloader(Deployments), description: "any errors which might have occurred during the bootstrap process"
    field :repository,       :git_repository, resolve: dataloader(Deployments), description: "a custom git repository if you want to define your own CAPI manifests"
    field :pr_automations,   list_of(:pr_automation), resolve: dataloader(Deployments), description: "pr automations that are relevant to managing this cluster"
    field :restore,          :cluster_restore, resolve: dataloader(Deployments), description: "the active restore for this cluster"
    field :object_store,     :object_store, resolve: dataloader(Deployments), description: "the object store connection bound to this cluster for backup/restore"
    field :parent_cluster,   :cluster, resolve: dataloader(Deployments), description: "the parent of this virtual cluster"
    field :insight,          :ai_insight, resolve: dataloader(Deployments), description: "an ai insight generated about issues discovered which might impact the health of this cluster"

    field :operational_layout, :operational_layout, resolve: dataloader(Deployments), description: "a high level description of the setup of common resources in a cluster"
    field :insight_components, list_of(:cluster_insight_component), resolve: dataloader(Deployments), description: "a set of kubernetes resources used to generate the ai insight for this cluster"

    field :nodes, list_of(:node), description: "list cached nodes for a cluster, this can be stale up to 5m",
      resolve: &Deployments.list_nodes/3
    field :node_metrics, list_of(:node_metric), description: "list the cached node metrics for a cluster, can also be stale up to 5m",
      resolve: &Deployments.list_node_metrics/3
    field :pinned_custom_resources, list_of(:pinned_custom_resource), description: "custom resources with dedicated views for this cluster",
      resolve: &Deployments.list_pinned_custom_resources/3
    field :upgrade_insights, list_of(:upgrade_insight),
      resolve: dataloader(Deployments),
      description: "any upgrade insights provided by your cloud provider that have been discovered by our agent"

    field :metrics_summary, :cluster_metrics_summary,
      resolve: &Deployments.metrics_summary/3,
      description: "A summation of the metrics utilization of the current cluster"

    field :status, :cluster_status,
      description: "the status of the cluster as seen from the CAPI operator, since some clusters can be provisioned without CAPI, this can be null",
      resolve: &Deployments.resolve_cluster_status/3

    @desc "a relay connection of all revisions of this cluster, these are periodically pruned up to a history limit"
    connection field :revisions, node_type: :cluster_revision do
      resolve &Deployments.list_cluster_revisions/3
    end

    @desc "lists OPA constraints registered in this cluster"
    connection field :policy_constraints, node_type: :policy_constraint do
      arg :namespace,  :string, description: "only show constraints with a violation for the given namespace"
      arg :kind,       :string, description: "only show constraints with a violation for the given kind"
      arg :kinds,      list_of(:string)
      arg :namespaces, list_of(:string)
      arg :q,          :string

      resolve &Deployments.list_policy_constraints/3
    end

    @desc "Computes a list of statistics for OPA constraint violations w/in this cluster"
    field :violation_statistics, list_of(:violation_statistic) do
      arg :field, non_null(:constraint_violation_field)

      resolve &Deployments.violation_statistics/3
    end

    @desc "list all alerts discovered for this cluster"
    connection field :alerts, node_type: :alert do
      resolve &Deployments.list_alerts/3
    end

    @desc "Queries logs for a cluster out of loki"
    field :logs, list_of(:log_stream) do
      arg :query,      non_null(:loki_query)
      arg :start,      :long
      arg :end,        :long
      arg :limit,      non_null(:integer)

      resolve &Deployments.cluster_logs/3
    end

    field :cluster_metrics, :cluster_metrics do
      arg :start,        :datetime
      arg :stop,         :datetime
      arg :step,         :string

      resolve &Deployments.metrics/3
    end

    field :cluster_node_metrics, :cluster_node_metrics do
      arg :node, non_null(:string)
      arg :start,        :datetime
      arg :stop,         :datetime
      arg :step,         :string

      resolve &Deployments.metrics/3
    end

    field :network_graph, list_of(:network_mesh_edge) do
      arg :namespace, :string
      arg :time,      :datetime

      resolve &Deployments.network_graph/3
    end

    @desc "A pod-level set of utilization metrics for this cluster for rendering a heat map"
    field :heat_map, :utilization_heat_map do
      arg :flavor, :heat_map_flavor, default_value: :pod
      resolve &Deployments.heat_map/3
    end

    @desc "fetches a list of runtime services found in this cluster, this is an expensive operation that should not be done in list queries"
    field :runtime_services, list_of(:runtime_service), resolve: &Deployments.runtime_services/3

    @desc "fetches the discovered custom resources with new versions to be used"
    field :deprecated_custom_resources, list_of(:deprecated_custom_resource), resolve: dataloader(Deployments)

    @desc "any upgrade insights provided by your cloud provider that have been discovered by our agent"
    field :cloud_addons, list_of(:cloud_addon), resolve: &Deployments.cloud_addons/3

    field :editable, :boolean, resolve: &Deployments.editable/3, description: "whether the current user can edit this cluster"

    connection field :audit_logs, node_type: :cluster_audit_log do
      resolve &Deployments.list_cluster_audits/3
    end

    timestamps()
  end

  @desc "A consolidated checklist of tasks that need to be completed to upgrade this cluster"
  object :cluster_upgrade_plan do
    field :compatibilities,   :boolean, description: "whether api compatibilities with all addons and kubernetes are satisfied"
    field :incompatibilities, :boolean, description: "whether mutual api incompatibilities with all addons and kubernetes have been satisfied"
    field :deprecations,      :boolean, description: "whether all api deprecations have been cleared for the target version"
    field :kubelet_skew,      :boolean, description: "whether the kubelet version is in line with the current version"
  end

  @desc "a historical revision of a cluster, including version, cloud and node group configuration"
  object :cluster_revision do
    field :id,         non_null(:id)
    field :version,    :string
    field :node_pools, list_of(:node_pool)

    timestamps()
  end

  @desc "A summarization of the core cpu and memory metrics for this cluster"
  object :cluster_metrics_summary do
    field :nodes,               :integer
    field :cpu_available,       :float,   description: "the cpu available in vcpu"
    field :cpu_total,           :float,   description: "the total cpu in use in the cluster measured in vcpu"
    field :cpu_used,            :integer, description: "a percentage cpu utilization of the cluster"
    field :memory_available,    :float,   description: "the total number of megabytes available in the cluster"
    field :memory_total,        :float,   description: "the total number of megabytes in use in the cluster"
    field :memory_used,         :integer, description: "a percentage memory utilization of the cluster"
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
    field :cloud_settings, :node_cloud_settings, description: "cloud specific settings for the node groups"

    timestamps()
  end

  @desc "a kubernetes node taint"
  object :taint do
    field :key,    non_null(:string)
    field :value,  non_null(:string)
    field :effect, non_null(:string)
  end

  @desc "the cloud configuration for a cluster"
  object :cloud_settings do
    field :aws,   :aws_cloud_settings
    field :gcp,   :gcp_cloud_settings
    field :azure, :azure_cloud_settings
  end

  @desc "aws specific cloud configuration"
  object :aws_cloud_settings do
    field :region, :string
  end

  @desc "gcp specific cluster cloud configuration"
  object :gcp_cloud_settings do
    field :project, :string
    field :network, :string
    field :region,  :string
  end

  @desc "azure-specific cluster cloud configuration"
  object :azure_cloud_settings do
    field :location,        :string
    field :subscription_id, :string
    field :resource_group,  :string
    field :network,         :string
  end

  @desc "cloud specific settings for a node pool"
  object :node_cloud_settings do
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

  @desc "Summary statistics of the upgradeability of your fleet"
  object :upgrade_statistics do
    field :count,       :integer, description: "total number of clusters"
    field :upgradeable, :integer, description: "the number of clusters currently upgradeable"
    field :latest,      :integer, description: "the number of clusters currently at the latest version"
    field :compliant,   :integer, description: "the number of clusters compliant w/ your versioning policy"
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

  object :deprecated_custom_resource do
    field :id,           non_null(:id)
    field :group,        non_null(:string)
    field :version,      non_null(:string)
    field :kind,         non_null(:string)
    field :namespace,    non_null(:string)
    field :name,         :string
    field :next_version, non_null(:string), description: "the next discovered version of this resource"
    field :cluster,      :cluster, resolve: dataloader(Deployments), description: "the cluster this resource belongs to"

    timestamps()
  end

  @desc "a service encapsulating a controller like istio/ingress-nginx/etc that is meant to extend the kubernetes api"
  object :runtime_service do
    field :id,             non_null(:id)
    field :name,           non_null(:string), description: "add-on name"
    field :version,        non_null(:string), description: "add-on version, should be semver formatted"
    field :instance_count, :integer, description: "the number of instances of this service we've detected"
    field :addon,          :runtime_addon,    description: "the full specification of this kubernetes add-on"
    field :addon_version,  :addon_version,    description: "the version of the add-on you've currently deployed"
    field :service,        :service_deployment,
      resolve: dataloader(Deployments),
      description: "the plural service it came from"

    timestamps()
  end

  @desc "a full specification of a kubernetes runtime component's requirements"
  object :runtime_addon do
    field :icon,        :string, description: "an icon to identify this runtime add-on"
    field :git_url,     :string, description: "the url to the add-ons git repository"
    field :readme,      :string,
      description: "the add-on's readme, this is a heavy operation that should not be performed w/in lists",
      resolve: fn addon, _, _ -> Clusters.readme(addon) end

    @desc "the release page for a runtime service at a version, this is a heavy operation not suitable for lists"
    field :release_url, :string do
      arg :version, non_null(:string)
      resolve fn addon, %{version: version}, _ -> Clusters.release(addon, version) end
    end

    field :versions, list_of(:addon_version)
  end

  @desc "the specification of a runtime service at a specific version"
  object :addon_version do
    field :version,           :string, description: "add-on version, semver formatted"
    field :kube,              list_of(:string), description: "kubernetes versions this add-on works with"
    field :requirements,      list_of(:version_reference), description: "any other add-ons this might require"
    field :incompatibilities, list_of(:version_reference), description: "any add-ons this might break"
    field :chart_version,     :string, description: "the version of the helm chart to install for this version"

    @desc "the release page for a runtime service at a version, this is a heavy operation not suitable for lists"
    field :release_url, :string do
      arg :version, non_null(:string)
      resolve fn
        %{addon: addon}, %{version: version}, _ -> Clusters.release(addon, version)
        _, _, _ -> {:ok, nil}
      end
    end

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

  @desc "a representation of a bulk operation to be performed on all agent services"
  object :agent_migration do
    field :id,            non_null(:id)
    field :name,          :string
    field :ref,           :string
    field :configuration, :map
    field :completed,     :boolean

    timestamps()
  end

  object :tag do
    field :id,    non_null(:id)
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  @desc "a cluster info data struct"
  object :cluster_status_info do
    field :healthy, :boolean
    field :count,   :integer
  end

  @desc "A reference to a custom resource you want to be displayed in the k8s dashboard"
  object :pinned_custom_resource do
    field :id,           non_null(:id)
    field :name,         non_null(:string)
    field :display_name, non_null(:string)
    field :group,        non_null(:string)
    field :version,      non_null(:string)
    field :kind,         non_null(:string)
    field :namespaced,   :boolean
    field :cluster,      :cluster, resolve: dataloader(Deployments)
  end

  object :upgrade_insight do
    field :id,              non_null(:id)
    field :name,            non_null(:string)
    field :version,         :string, description: "the k8s version this insight applies to"
    field :description,     :string, description: "longform description of this insight"
    field :status,          :upgrade_insight_status
    field :refreshed_at,    :datetime
    field :transitioned_at, :datetime

    field :details, list_of(:upgrade_insight_detail), resolve: dataloader(Deployments)

    timestamps()
  end

  object :upgrade_insight_detail do
    field :id,          non_null(:id)
    field :status,      :upgrade_insight_status
    field :used,        :string, description: "a possibly deprecated API"
    field :replacement, :string, description: "the replacement for this API"
    field :client_info, list_of(:insight_client_info), description: "information about the HTTP clients triggering this insight"

    field :replaced_in,  :string
    field :removed_in,   :string
    field :last_used_at, :datetime

    timestamps()
  end

  object :insight_client_info do
    field :user_agent,      :string
    field :count,           :string
    field :last_request_at, :datetime
  end

  object :cluster_usage do
    field :id,                 non_null(:id)
    field :cpu,                :float
    field :memory,             :float
    field :gpu,                :float
    field :storage,            :float, description: "the amount of storage used by this cluster"
    field :cpu_util,           :float, description: "the amount of cpu utilized"
    field :mem_util,           :float, description: "the amount of memory utilized"

    field :cpu_cost,           :float
    field :memory_cost,        :float
    field :gpu_cost,           :float
    field :ingress_cost,       :float
    field :load_balancer_cost, :float
    field :egress_cost,        :float
    field :node_cost,          :float
    field :storage_cost,       :float
    field :control_plane_cost, :float

    field :cluster, :cluster, resolve: dataloader(Deployments)

    connection field :namespaces, node_type: :cluster_namespace_usage do
      arg :q, :string
      resolve &Deployments.list_namespace_usage/3
    end

    connection field :recommendations, node_type: :cluster_scaling_recommendation do
      arg :type, :scaling_recommendation_type
      arg :q,    :string
      resolve &Deployments.list_scaling_recommendations/3
    end

    connection field :history, node_type: :cluster_usage_history do
      resolve &Deployments.list_cluster_usage_history/3
    end

    timestamps()
  end

  object :cluster_usage_history do
    field :id,        non_null(:id)
    field :timestamp, non_null(:datetime)

    field :cpu_cost,           :float
    field :memory_cost,        :float
    field :gpu_cost,           :float
    field :ingress_cost,       :float
    field :load_balancer_cost, :float
    field :egress_cost,        :float
    field :node_cost,          :float
    field :storage_cost,       :float
    field :control_plane_cost, :float

    field :cluster, :cluster, resolve: dataloader(Deployments)

    timestamps()
  end

  object :cluster_namespace_usage do
    field :id,        non_null(:id)
    field :namespace, :string
    field :cpu,       :float
    field :memory,    :float
    field :gpu,       :float
    field :storage,   :float, description: "the amount of storage used by this namespace"
    field :cpu_util,  :float, description: "the amount of cpu utilized"
    field :mem_util,  :float, description: "the amount of memory utilized"

    field :cpu_cost,           :float
    field :memory_cost,        :float
    field :gpu_cost,           :float
    field :ingress_cost,       :float
    field :storage_cost,       :float
    field :load_balancer_cost, :float
    field :egress_cost,        :float

    field :cluster, :cluster, resolve: dataloader(Deployments)

    timestamps()
  end

  object :cluster_scaling_recommendation do
    field :id,                    non_null(:id)
    field :type,                  :scaling_recommendation_type
    field :namespace,             :string
    field :name,                  :string
    field :container,             :string

    field :memory_request,        :float
    field :cpu_request,           :float
    field :memory_recommendation, :float
    field :cpu_recommendation,    :float

    field :cpu_cost,              :float
    field :memory_cost,           :float
    field :gpu_cost,              :float

    field :cpu_util,              :float, description: "the historical cpu utilization for this scope"
    field :memory_util,           :float, description: "the historical memory utilization for this scope"
    field :gpu_util,              :float, description: "the historical gpu utilization for this scope"

    field :service, :service_deployment, resolve: dataloader(Deployments)
    field :cluster, :cluster, resolve: dataloader(Deployments)

    timestamps()
  end

  object :cluster_audit_log do
    field :id,            non_null(:id)
    field :method,        non_null(:string)
    field :path,          non_null(:string)
    field :response_code, :integer

    field :cluster, :cluster, resolve: dataloader(Deployments)
    field :actor,   :user,    resolve: dataloader(User)

    timestamps()
  end

  object :cluster_registration do
    field :id,         non_null(:id)
    field :name,       :string, description: "the name to give to the cluster"
    field :handle,     :string, description: "the handle to apply to the cluster"
    field :machine_id, non_null(:string), description: "a unique machine id for the created cluster"
    field :tags,       list_of(:tag), description: "the tags to apply to the given cluster"
    field :metadata,   :map, description: "additional metadata to apply to the cluster"

    field :creator,    :user,    resolve: dataloader(Deployments)
    field :project,    :project, resolve: dataloader(Deployments), description: "the project the cluster will live in"

    timestamps()
  end

  @desc "A reference to a built ISO image to be used for flashing new edge clusters"
  object :cluster_iso_image do
    field :id,       non_null(:id)
    field :image,    non_null(:string), description: "the image this iso was pushed to"
    field :registry, non_null(:string), description: "the registry holding the image"
    field :user,     :string, description: "ssh username for the new device"
    field :password, :string, description: "ssh password for the new device"
    field :project,  :project, resolve: dataloader(Deployments), description: "the project this cluster will live in (can be inferred from bootstrap token)"

    timestamps()
  end

  object :cloud_addon do
    field :id,      non_null(:id)
    field :distro,  non_null(:cluster_distro)
    field :name,    non_null(:string)
    field :version, non_null(:string)

    field :info,         :cloud_addon_information
    field :version_info, :cloud_addon_version_information

    field :cluster, :cluster, resolve: dataloader(Deployments)

    timestamps()
  end

  object :cloud_addon_information do
    field :name,      :string
    field :publisher, :string
    field :versions,  list_of(:cloud_addon_version_information)
  end

  object :cloud_addon_version_information do
    field :version,         :string
    field :compatibilities, list_of(:string)

    @desc "checks if this is blocking a specific kubernetes upgrade"
    field :blocking, :boolean do
      arg :kube_version, non_null(:string)
      resolve fn me, %{kube_version: vsn}, _ -> {:ok, Compatibilities.CloudAddOn.Version.blocking?(me, vsn)} end
    end
  end

  @desc "An abstract workload discovered by querying statistics on a service mesh"
  object :network_mesh_workload do
    field :id,        non_null(:string)
    field :name,      non_null(:string)
    field :namespace, :string
    field :service,   :string
  end

  @desc "The relevant statistics for traffic within a service mesh"
  object :network_mesh_statistics do
    field :bytes,               :float
    field :connections,         :float
    field :packets,             :float
    field :http200,             :float
    field :http400,             :float
    field :http500,             :float
    field :http_client_latency, :float
  end

  @desc "An edge representing traffic statistics between two workloads in a service mesh"
  object :network_mesh_edge do
    field :id,          non_null(:string)
    field :from,        non_null(:network_mesh_workload)
    field :to,          non_null(:network_mesh_workload)
    field :statistics,  non_null(:network_mesh_statistics)
  end

  @desc "a high level description of the setup of common resources in a cluster"
  object :operational_layout do
    field :service_mesh, :service_mesh
  end

  connection node_type: :cluster
  connection node_type: :cluster_provider
  connection node_type: :cluster_revision
  connection node_type: :tag
  connection node_type: :cluster_usage
  connection node_type: :cluster_namespace_usage
  connection node_type: :cluster_scaling_recommendation
  connection node_type: :cluster_usage_history
  connection node_type: :cluster_audit_log
  connection node_type: :cluster_registration
  connection node_type: :cluster_iso_image

  delta :cluster
  delta :cluster_provider

  object :public_cluster_mutations do
    @desc "a regular status ping to be sent by the deploy operator"
    field :ping_cluster, :cluster do
      middleware ClusterAuthenticated
      arg :attributes, non_null(:cluster_ping)

      safe_resolve &Deployments.ping/2
    end

    field :ingest_cluster_cost, :boolean do
      middleware ClusterAuthenticated
      arg :costs, non_null(:cost_ingest_attributes)

      resolve &Deployments.cost_ingest/2
    end

    @desc "registers a list of runtime services discovered for the current cluster"
    field :register_runtime_services, :integer do
      middleware ClusterAuthenticated
      arg :services,   list_of(:runtime_service_attributes)
      arg :layout,     :operational_layout_attributes
      arg :deprecated, list_of(:deprecated_custom_resource_attributes)
      arg :service_id, :id

      resolve &Deployments.create_runtime_services/2
    end

    @desc "agent api to persist upgrade insights for its cluster"
    field :save_upgrade_insights, list_of(:upgrade_insight) do
      middleware ClusterAuthenticated
      arg :insights, list_of(:upgrade_insight_attributes)
      arg :addons,   list_of(:cloud_addon_attributes)

      resolve &Deployments.save_upgrade_insights/2
    end

    field :upsert_virtual_cluster, :cluster do
      middleware Authenticated
      arg :attributes, non_null(:cluster_attributes)
      arg :parent_id,  non_null(:id)

      resolve &Deployments.upsert_virtual_cluster/2
    end

    field :delete_virtual_cluster, :cluster do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_virtual_cluster/2
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
      middleware Authenticated
      arg :q,           :string
      arg :healthy,     :boolean
      arg :tag,         :tag_input
      arg :tag_query,   :tag_query
      arg :backups,     :boolean
      arg :project_id,  :id
      arg :parent_id,   :id
      arg :upgradeable, :boolean

      resolve &Deployments.list_clusters/2
    end

    @desc "gets summary information for all healthy/unhealthy clusters in your fleet"
    field :cluster_statuses, list_of(:cluster_status_info) do
      middleware Authenticated
      arg :q,          :string
      arg :tag,        :tag_input
      arg :project_id, :id

      resolve &Deployments.cluster_statuses/2
    end

    @desc "gets summary information for upgradeability in your fleet"
    field :upgrade_statistics, :upgrade_statistics do
      middleware Authenticated
      arg :q,          :string
      arg :tag,        :tag_input
      arg :project_id, :id

      resolve &Deployments.upgrade_statistics/2
    end

    @desc "lists tags applied to any clusters in the fleet"
    field :tags, list_of(:string) do
      middleware Authenticated
      arg :tag, :string

      resolve &Deployments.list_tags/2
    end

    @desc "adds the ability to search/filter through all tag name/value pairs"
    connection field :tag_pairs, node_type: :tag do
      middleware Authenticated
      arg :type, :tag_type, description: "the variant of tag you're querying"
      arg :tag,  :string, description: "only return tags with name==tag"
      arg :q,    :string, description: "search for tags with q as a substring in name or value"

      resolve &Deployments.search_tags/2
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
      arg :id,    :id
      arg :cloud, :string
      arg :name,  :string

      resolve &Deployments.resolve_provider/2
    end

    @desc "list all addons currently resident in the artifacts repo"
    field :cluster_add_ons, list_of(:cluster_add_on) do
      middleware Authenticated

      resolve &Deployments.list_addons/2
    end

    @desc "fetch an individual runtime service for more thorough detail views"
    field :runtime_service, :runtime_service do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_runtime_service/2
    end

    connection field :cluster_usages, node_type: :cluster_usage do
      middleware Authenticated
      arg :q,          :string
      arg :tag_query,  :tag_query
      arg :project_id, :id

      resolve &Deployments.list_cluster_usage/2
    end

    field :cluster_usage, :cluster_usage do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_cluster_usage/2
    end

    field :cluster_registration, :cluster_registration do
      middleware Authenticated
      arg :id,         :id
      arg :machine_id, :string

      resolve &Deployments.resolve_cluster_registration/2
    end

    connection field :cluster_registrations, node_type: :cluster_registration do
      middleware Authenticated

      resolve &Deployments.list_cluster_registrations/2
    end

    field :cluster_iso_image, :cluster_iso_image do
      middleware Authenticated
      arg :id,         :id
      arg :image,      :string

      resolve &Deployments.resolve_cluster_iso_image/2
    end

    connection field :cluster_iso_images, node_type: :cluster_iso_image do
      middleware Authenticated

      resolve &Deployments.list_cluster_iso_images/2
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

    field :create_agent_migration, :agent_migration do
      middleware Authenticated
      arg :attributes, non_null(:agent_migration_attributes)

      resolve &Deployments.create_agent_migration/2
    end

    field :create_pinned_custom_resource, :pinned_custom_resource do
      middleware Authenticated
      arg :attributes, non_null(:pinned_custom_resource_attributes)

      resolve &Deployments.create_pinned_custom_resource/2
    end

    field :delete_pinned_custom_resource, :pinned_custom_resource do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_pinned_custom_resource/2
    end

    field :add_cluster_audit_log, :boolean do
      middleware Authenticated
      arg :audit, non_null(:cluster_audit_attributes)

      resolve &Deployments.add_cluster_audit/2
    end

    field :apply_scaling_recommendation, :pull_request do
      middleware Authenticated
      arg :id, non_null(:id), description: "the id of the scaling recommendation to fix"

      resolve &Deployments.scaling_pr/2
    end

    field :suggest_scaling_recommendation, :string do
      middleware Authenticated
      arg :id, non_null(:id), description: "the id of the scaling recommendation to fix"

      resolve &Deployments.scaling_pr_suggestion/2
    end

    field :create_cluster_registration, :cluster_registration do
      middleware Authenticated
      arg :attributes, non_null(:cluster_registration_create_attributes)

      resolve &Deployments.create_cluster_registration/2
    end

    field :update_cluster_registration, :cluster_registration do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:cluster_registration_update_attributes)

      resolve &Deployments.update_cluster_registration/2
    end

    field :delete_cluster_registration, :cluster_registration do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_cluster_registration/2
    end

    field :create_cluster_iso_image, :cluster_iso_image do
      middleware Authenticated
      arg :attributes, non_null(:cluster_iso_image_attributes)

      resolve &Deployments.create_cluster_iso_image/2
    end

    field :update_cluster_iso_image, :cluster_iso_image do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:cluster_iso_image_attributes)

      resolve &Deployments.update_cluster_iso_image/2
    end

    field :delete_cluster_iso_image, :cluster_iso_image do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_cluster_iso_image/2
    end
  end
end
