defmodule Console.GraphQl.Deployments.Cluster do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments}

  input_object :cluster_attributes do
    field :name,        non_null(:string)
    field :provider_id, :id
    field :version,     non_null(:string)
    field :node_pools,  list_of(:node_pool_attributes)
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

  object :cluster_provider do
    field :name,       non_null(:string)
    field :id,         non_null(:id)
    field :git,        non_null(:git_ref)
    field :repository, :git_repository, resolve: dataloader(Deployments)
    field :service,    :service, resolve: dataloader(Deployments)

    timestamps()
  end

  object :cluster do
    field :id, non_null(:id)

    field :name,        non_null(:string)
    field :version,     non_null(:string)

    field :node_pools,  list_of(:node_pool), resolve: dataloader(Deployments)
    field :provider,    :cluster_provider, resolve: dataloader(Deployments)
    field :service,     :service, resolve: dataloader(Deployments)

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

  object :cluster_queries do
    connection field :clusters, node_type: :cluster do
      middleware Authenticated

      resolve &Deployments.list_clusters/2
    end

    field :cluster, :cluster do
      middleware Authenticated

      resolve &Deployments.resolve_cluster/2
    end
  end

  object :cluster_mutations do
    field :create_cluster, :cluster do
      middleware Authenticated
      arg :attributes, non_null(:cluster_attributes)

      resolve &Deployments.create_cluster/2
    end
  end
end
