defmodule Console.GraphQl.Database do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Databases

  input_object :clone_attributes do
    field :s3_access_key_id,     :string
    field :s3_secret_access_key, :string
    field :s3_wal_path,          :string
    field :s3_endpoint,          :string
    field :uid,                  :string
  end

  object :postgresql do
    field :metadata, non_null(:metadata)
    field :spec,     non_null(:postgresql_spec)
    field :status,   :postgresql_status

    field :instances, list_of(:postgres_instance), resolve: fn
      pg, _, _ -> {:ok, Databases.list_postgres_instances(pg)}
    end
  end

  object :postgresql_spec do
    field :team_id,             :string
    field :users,               :map
    field :resources,           :resources
    field :postgresql,          :postgres_settings
    field :number_of_instances, :integer
    field :databases,           :map

    field :volume,              :database_volume

    field :pods, list_of(:pod), resolve: fn
      pg, _, _ -> Databases.list_postgres_pods(pg)
    end
  end

  object :database_volume do
    field :size, :string
  end

  object :postgres_settings do
    field :version, :string
  end

  object :postgres_instance do
    field :uid, non_null(:string)
  end

  object :postgresql_status do
    field :cluster_status, :string, resolve: fn
      %{"PostgresClusterStatus" => status}, _, _ -> {:ok, status}
      _, _, _ -> {:ok, "Unknown"}
    end
  end

  object :database_queries do
    field :postgres_databases, list_of(:postgresql) do
      middleware Authenticated
      middleware Feature, :databaseManagement

      safe_resolve &Databases.list_postgres/2
    end

    field :postgres_database, :postgresql do
      middleware Authenticated
      middleware Feature, :databaseManagement

      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)

      safe_resolve &Databases.resolve_postgres/2
    end
  end

  object :database_mutations do
    field :restore_postgres, :postgresql do
      middleware Authenticated
      middleware AdminRequired
      middleware Feature, :databaseManagement

      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      arg :timestamp, non_null(:datetime)
      arg :clone,     :clone_attributes

      safe_resolve &Databases.restore_postgres/2
    end
  end
end
