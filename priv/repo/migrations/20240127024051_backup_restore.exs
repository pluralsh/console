defmodule Console.Repo.Migrations.BackupRestore do
  use Ecto.Migration

  def change do
    create table(:object_stores, primary_key: false) do
      add :id,     :uuid, primary_key: true
      add :name,   :string

      add :s3,    :map
      add :gcs,   :map
      add :azure, :map

      timestamps()
    end

    create table(:cluster_backups, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :name,       :string
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create table(:cluster_restores, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :status,    :integer
      add :backup_id, references(:cluster_backups, type: :uuid)

      timestamps()
    end

    create table(:cluster_restore_history, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :restore_id, references(:cluster_restores, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    alter table(:clusters) do
      add :restore_id,      references(:cluster_restores, type: :uuid, on_delete: :nilify_all)
      add :object_store_id, references(:object_stores, type: :uuid, on_delete: :nilify_all)
    end

    create table(:service_contexts, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :name,          :string
      add :configuration, :map
      add :secrets,       :map

      timestamps()
    end

    create table(:service_context_bindings, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)
      add :context_id, references(:service_contexts, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:object_stores, [:name])
    create unique_index(:cluster_backups, [:name])
    create unique_index(:service_contexts, [:name])
    create index(:cluster_backups, [:cluster_id])
    create index(:service_context_bindings, [:service_id])
  end
end
