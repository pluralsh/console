defmodule Console.GraphQl.Deployments.Cluster do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments}

  input_object :cluster_attributes do
    field :name,          non_null(:string)
    field :provider_id,   :id
    field :version,       non_null(:string)
    field :node_pools,    list_of(:node_pool_attributes)
    field :read_bindings, list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)
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

  object :cluster_provider do
    field :id,         non_null(:id)
    field :name,       non_null(:string)
    field :namespace,  non_null(:string)
    field :cloud,      non_null(:string)
    field :git,        non_null(:git_ref)
    field :repository, :git_repository, resolve: dataloader(Deployments)
    field :service,    :service_deployment, resolve: dataloader(Deployments)

    field :editable,   :boolean, resolve: &Deployments.editable/3

    timestamps()
  end

  object :cluster do
    field :id,              non_null(:id)
    field :name,            non_null(:string)
    field :version,         non_null(:string)
    field :current_version, :string

    field :deleted_at, :datetime
    field :pinged_at,  :datetime

    field :read_bindings, list_of(:policy_binding), resolve: dataloader(Deployments)
    field :write_bindings, list_of(:policy_binding), resolve: dataloader(Deployments)

    field :node_pools,  list_of(:node_pool), resolve: dataloader(Deployments)
    field :provider,    :cluster_provider, resolve: dataloader(Deployments)
    field :service,     :service_deployment, resolve: dataloader(Deployments)
    field :api_deprecations, list_of(:api_deprecation), resolve: dataloader(Deployments)

    field :editable,   :boolean, resolve: &Deployments.editable/3

    timestamps()
  end

  object :node_pool do
    field :id,             non_null(:id)
    field :name,           non_null(:string)
    field :min_size,       non_null(:integer)
    field :max_size,       non_null(:integer)
    field :instance_type,  non_null(:string)
    field :labels,         :map
    field :taints,         list_of(:taint)
    field :cloud_settings, :cloud_settings

    timestamps()
  end

  object :taint do
    field :key,    non_null(:string)
    field :value,  non_null(:string)
    field :effect, non_null(:string)
  end

  object :cloud_settings do
    field :aws, :aws_cloud
  end

  object :aws_cloud do
    field :launch_template_id, :string
  end

  connection node_type: :cluster
  connection node_type: :cluster_provider

  delta :cluster
  delta :cluster_provider

  object :public_cluster_mutations do
    field :ping_cluster, :cluster do
      middleware ClusterAuthenticated
      arg :attributes, non_null(:cluster_ping)

      safe_resolve &Deployments.ping/2
    end
  end

  object :cluster_queries do
    connection field :clusters, node_type: :cluster do
      middleware Authenticated

      resolve &Deployments.list_clusters/2
    end

    connection field :cluster_providers, node_type: :cluster_provider do
      middleware Authenticated

      resolve &Deployments.list_providers/2
    end

    field :cluster, :cluster do
      middleware Authenticated, :cluster
      arg :id, :id

      resolve &Deployments.resolve_cluster/2
    end

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
