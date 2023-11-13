defmodule Console.Repo.Migrations.ClusterRevisions do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :cloud_settings, :map
    end

    create table(:cluster_revisions, primary_key: false) do
      add :id,             :uuid, primary_key: true
      add :cluster_id,     references(:clusters, type: :uuid, on_delete: :delete_all)
      add :version,        :string
      add :node_pools,     :map
      add :cloud_settings, :map

      timestamps()
    end

    create index(:cluster_revisions, [:cluster_id])
  end
end
