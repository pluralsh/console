defmodule Console.GraphQl.Deployments.Backup do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments}
  alias Console.Schema.ClusterRestore

  ecto_enum :restore_status, ClusterRestore.Status

  input_object :object_store_attributes do
    field :name,  non_null(:string)
    field :s3,    :s3_store_attributes
    field :gcs,   :gcs_store_attributes
    field :azure, :azure_store_attributes
  end

  input_object :backup_attributes do
    field :name,              non_null(:string)
    field :namespace,         non_null(:string)
    field :garbage_collected, :boolean
  end

  input_object :restore_attributes do
    field :status, non_null(:restore_status)
  end

  input_object :s3_store_attributes do
    field :bucket,            non_null(:string)
    field :region,            :string
    field :endpoint,          :string
    field :access_key_id,     non_null(:string)
    field :secret_access_key, non_null(:string)
  end

  input_object :gcs_store_attributes do
    field :bucket, non_null(:string)
    field :region, non_null(:string)
    field :application_credentials, non_null(:string)
  end

  input_object :azure_store_attributes do
    field :storage_account, non_null(:string)
    field :container,       non_null(:string)
    field :subscription_id, non_null(:string)
    field :tenant_id,       non_null(:string)
    field :client_id,       non_null(:string)
    field :client_secret,   non_null(:string)
  end

  object :object_store do
    field :id,    non_null(:id)
    field :name,  non_null(:string)
    field :s3,    :s3_store
    field :gcs,   :gcs_store
    field :azure, :azure_store

    timestamps()
  end

  object :cluster_backup do
    field :id,                non_null(:id)
    field :name,              non_null(:string)
    field :namespace,         non_null(:string)
    field :garbage_collected, :boolean

    field :cluster, :cluster, resolve: dataloader(Deployments)

    timestamps()
  end

  object :cluster_restore do
    field :id,     non_null(:id)
    field :status, non_null(:restore_status)
    field :backup, :cluster_backup, resolve: dataloader(Deployments)

    timestamps()
  end

  object :cluster_restore_history do
    field :id, non_null(:id)
    field :cluster, :cluster, resolve: dataloader(Deployments)
    field :restore, :cluster_restore, resolve: dataloader(Deployments)

    timestamps()
  end

  object :s3_store do
    field :bucket,            non_null(:string)
    field :region,            :string
    field :endpoint,          :string
    field :access_key_id,     non_null(:string)
  end

  object :gcs_store do
    field :bucket, non_null(:string)
    field :region, non_null(:string)
  end

  object :azure_store do
    field :storage_account, non_null(:string)
    field :container,       non_null(:string)
    field :subscription_id, non_null(:string)
    field :tenant_id,       non_null(:string)
    field :client_id,       non_null(:string)
  end

  connection node_type: :object_store
  connection node_type: :cluster_backup
  connection node_type: :cluster_restore

  object :public_backup_queries do
    field :cluster_restore, :cluster_restore do
      middleware Authenticated, :cluster
      arg :id, non_null(:id)

      resolve &Deployments.resolve_cluster_restore/2
    end
  end

  object :public_backup_mutations do
    @desc "upserts a cluster backup resource"
    field :create_cluster_backup, :cluster_backup do
      middleware ClusterAuthenticated
      arg :attributes, non_null(:backup_attributes)

      resolve &Deployments.create_cluster_backup/2
    end

    field :update_cluster_restore, :cluster_restore do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)
      arg :attributes, non_null(:restore_attributes)

      resolve &Deployments.update_cluster_restore/2
    end
  end

  object :backup_queries do
    field :cluster_backup, :cluster_backup do
      middleware Authenticated
      arg :id,         :id
      arg :cluster_id, :id
      arg :namespace,  :string
      arg :name,       :string

      resolve &Deployments.resolve_cluster_backup/2
    end

    connection field :cluster_backups, node_type: :cluster_backup do
      middleware Authenticated
      arg :cluster_id, non_null(:id)

      resolve &Deployments.list_cluster_backups/2
    end

    connection field :cluster_restores, node_type: :cluster_restore do
      middleware Authenticated
      arg :cluster_id, non_null(:id)

      resolve &Deployments.list_cluster_restores/2
    end

    connection field :object_stores, node_type: :object_store do
      middleware Authenticated

      resolve &Deployments.list_object_stores/2
    end
  end

  object :backup_mutations do
    field :create_object_store, :object_store do
      middleware Authenticated
      arg :attributes, non_null(:object_store_attributes)

      resolve &Deployments.create_object_store/2
    end

    field :update_object_store, :object_store do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:object_store_attributes)

      resolve &Deployments.update_object_store/2
    end

    field :delete_object_store, :object_store do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_object_store/2
    end

    field :configure_backups, :cluster do
      middleware Authenticated
      arg :cluster_id, non_null(:id)
      arg :store_id,   non_null(:id)

      resolve &Deployments.configure_backups/2
    end

    field :create_cluster_restore, :cluster_restore do
      middleware Authenticated
      arg :backup_id, non_null(:id)

      resolve &Deployments.create_cluster_restore/2
    end
  end
end
