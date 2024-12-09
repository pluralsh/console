defmodule Console.Repo.Migrations.AddUsage do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :cost, :map
    end

    create table(:cluster_usage, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :memory,     :float
      add :cpu,        :float
      add :storage,    :float

      add :memory_util, :float
      add :cpu_util,    :float

      timestamps()
    end

    create unique_index(:cluster_usage, [:cluster_id])

    create table(:cluster_namespace_usage, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :namespace,  :string
      add :memory,     :float
      add :cpu,        :float
      add :storage,    :float

      add :memory_util, :float
      add :cpu_util,    :float

      timestamps()
    end

    create index(:cluster_namespace_usage, [:cluster_id])
    create unique_index(:cluster_namespace_usage, [:cluster_id, :namespace])

    create table(:cluster_scaling_recommendations, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)
      add :type,       :integer
      add :namespace,  :string
      add :name,       :string
      add :container,  :string

      add :memory_request, :float
      add :cpu_request,    :float

      add :memory_recommendation, :float
      add :cpu_recommendation,    :float

      timestamps()
    end

    create index(:cluster_scaling_recommendations, [:cluster_id])
    create unique_index(:cluster_scaling_recommendations, [:cluster_id, :type, :namespace, :name, :container])
  end
end
