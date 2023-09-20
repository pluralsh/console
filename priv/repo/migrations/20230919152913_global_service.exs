defmodule Console.Repo.Migrations.GlobalService do
  use Ecto.Migration

  def change do
    create table(:tags, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)
      add :name,       :string
      add :value,      :string

      timestamps()
    end

    create table(:global_services, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :name,        :string
      add :service_id,  references(:services, type: :uuid, on_delete: :delete_all)
      add :provider_id, references(:cluster_providers, type: :uuid, on_delete: :delete_all)
      add :tags,        :map

      timestamps()
    end

    alter table(:services) do
      add :owner_id, references(:global_services, type: :uuid)
    end

    create unique_index(:tags, [:cluster_id, :name])
    create index(:tags, [:cluster_id])
    create unique_index(:tags, [:service_id, :name])
    create index(:tags, [:service_id])

    create unique_index(:global_services, [:service_id])
    create unique_index(:services, [:cluster_id, :owner_id])
  end
end
