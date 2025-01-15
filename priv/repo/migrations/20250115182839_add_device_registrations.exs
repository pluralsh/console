defmodule Console.Repo.Migrations.AddDeviceRegistrations do
  use Ecto.Migration

  def change do
    create table(:cluster_registrations, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :machine_id, :string
      add :name,       :string
      add :handle,     :string
      add :tags,       :map
      add :metadata,   :map

      add :creator_id, references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :project_id, references(:projects, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:cluster_registrations, [:project_id])
    create index(:cluster_registrations, [:creator_id])
    create unique_index(:cluster_registrations, [:handle])
  end
end
